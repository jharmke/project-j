import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as crypto from 'crypto';

// Server-side proxy for the FatSecret food database. Before this existed the app signed FatSecret
// OAuth 1.0a requests ON DEVICE, which meant the consumer key + secret were baked into the shipped
// bundle and extractable from the binary. This function holds those secrets server-side; the client
// now just says "run this method with these params" and never sees a key.
//
// Faithfully reproduces the exact signing the client used (plain encodeURIComponent, HMAC-SHA1,
// sorted params) so FatSecret validates the signatures identically. Only the three methods the app
// actually uses are allowed, so a signed-in client cannot turn this into a general FatSecret relay
// that burns the account's daily quota.
//
// Chat/content is not relevant here; this only forwards food lookups. No double dashes in
// user-facing strings (project rule) -- this function returns raw FatSecret JSON, no prose.

const FATSECRET_KEY = defineSecret('FATSECRET_KEY');
const FATSECRET_SECRET = defineSecret('FATSECRET_SECRET');

const FS_BASE = 'https://platform.fatsecret.com/rest/server.api';

// The only FatSecret methods the app uses, each with the HTTP verb the client signed it under.
// foods.search was POSTed; the two read lookups were GET. Matching the verb keeps the signature
// base string identical to what already works.
const ALLOWED_METHODS: Record<string, 'GET' | 'POST'> = {
  'foods.search': 'POST',
  'food.find_id_for_barcode': 'GET',
  'food.get.v4': 'GET',
};

// Plain encodeURIComponent, matching the client's original signRequest (proven to validate with
// FatSecret for these params; the client also strips apostrophes from queries before calling).
function enc(s: string): string {
  return encodeURIComponent(s);
}

function hmacSha1Base64(key: string, message: string): string {
  return crypto.createHmac('sha1', key).update(message).digest('base64');
}

function sign(verb: string, params: Record<string, string>, secret: string): string {
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${enc(k)}=${enc(params[k])}`)
    .join('&');
  const base = `${verb}&${enc(FS_BASE)}&${enc(sorted)}`;
  const signingKey = `${enc(secret)}&`;
  return hmacSha1Base64(signingKey, base);
}

function buildOAuth(consumerKey: string, nonceSeed: string, ts: number): Record<string, string> {
  return {
    oauth_consumer_key: consumerKey,
    oauth_nonce: nonceSeed,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: ts.toString(),
    oauth_version: '1.0',
  };
}

// Whitelist the per-method params we forward, so nothing unexpected reaches FatSecret. Values are
// always coerced to strings (FatSecret signing is string-based).
function sanitizeParams(method: string, raw: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  const take = (k: string) => {
    const v = raw[k];
    if (v !== undefined && v !== null) out[k] = String(v);
  };
  if (method === 'foods.search') {
    take('search_expression');
    take('max_results');
  } else if (method === 'food.find_id_for_barcode') {
    take('barcode');
  } else if (method === 'food.get.v4') {
    take('food_id');
  }
  return out;
}

export const fatSecretProxy = onCall(
  // minInstances: 1 keeps one instance warm so the first food lookup after a cold app launch
  // doesn't pay container boot + Secret Manager fetch (this function pulls two secrets on cold
  // start before it can do anything) -- that boot cost was Justin's ~10s first-tap-only delay.
  // Idle instances under minInstances are billed for MEMORY only, not CPU (default mode, no
  // "CPU always allocated") -- roughly $1-2/month for a 256MB instance, not a real cost.
  { secrets: [FATSECRET_KEY, FATSECRET_SECRET], maxInstances: 10, minInstances: 1 },
  async (request) => {
    // Auth: only signed-in users. The key never leaves the server regardless, but gating on auth
    // keeps anonymous traffic off the FatSecret account quota.
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Please sign in to search foods.');
    }

    const data = (request.data ?? {}) as { method?: unknown; params?: unknown };
    const method = typeof data.method === 'string' ? data.method : '';
    const verb = ALLOWED_METHODS[method];
    if (!verb) {
      throw new HttpsError('invalid-argument', 'Unsupported food lookup.');
    }

    const rawParams =
      data.params && typeof data.params === 'object' ? (data.params as Record<string, unknown>) : {};
    const apiParams = sanitizeParams(method, rawParams);

    // format=json + method are always server-controlled.
    const allApiParams = { ...apiParams, method, format: 'json' };

    // Nonce + timestamp are server-generated (Date.now is fine in a function; not client-spoofable).
    const nonceSeed =
      Math.random().toString(36).substring(2) + Date.now().toString(36);
    const ts = Math.floor(Date.now() / 1000);
    const oauth = buildOAuth(FATSECRET_KEY.value(), nonceSeed, ts);

    const allParams = { ...oauth, ...allApiParams };
    const signature = sign(verb, allParams, FATSECRET_SECRET.value());
    const finalParams: Record<string, string> = { ...allParams, oauth_signature: signature };

    const encoded = Object.keys(finalParams)
      .sort()
      .map((k) => `${enc(k)}=${enc(finalParams[k])}`)
      .join('&');

    try {
      let res: Response;
      if (verb === 'POST') {
        res = await fetch(FS_BASE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: encoded,
        });
      } else {
        res = await fetch(`${FS_BASE}?${encoded}`, { method: 'GET' });
      }
      if (!res.ok) {
        return { ok: false, reason: 'upstream', status: res.status };
      }
      const json = await res.json();
      return { ok: true, data: json };
    } catch (err) {
      console.error('fatSecretProxy call failed', { method, name: (err as Error)?.name });
      return { ok: false, reason: 'unavailable' };
    }
  },
);
