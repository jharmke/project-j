// functions/src/aiUsageMeter.ts
//
// PLAN.md item 0. Records what every AI call ACTUALLY cost, using Anthropic's own token counts.
//
// ⚠️ WHY THIS EXISTS. Anthropic returns a `usage` object on every single call -- exact input, output and
// cache token counts -- and until 2026-08-05 the code read the reply and threw that object away. So NOTHING
// in the app knew what anything cost, every figure in SPEC_cost_model.md was arithmetic rather than a
// reading, and two sessions were spent arguing about numbers nobody could check. Item O's "~4.6 cents a
// month" for Smart Coach turned out to be roughly 8x low; a meter would have caught that on day one.
//
// ⚠️ TOKENS ARE THE RECORD, DOLLARS ARE A CONVENIENCE. Token counts come from Anthropic and are facts. The
// USD figure is computed here from a price table that WILL go stale (and is wrong the moment a 1-hour cache
// TTL ships, because that writes at 2x rather than 1.25x). If the two ever disagree, trust the tokens and
// fix the table.
//
// ⚠️ DELIBERATELY A SEPARATE COLLECTION. It does NOT write to `ai_usage*`, which hold the daily caps and
// the pitch budget and are load-bearing. A bug in a metering write must never be able to break a cap, hand
// out a paid feature, or corrupt the pitch counter. Nothing here is read by any product code.
import * as admin from 'firebase-admin';

/** Per MILLION tokens. Keep in step with the table in SPEC_cost_model.md section 10b. */
const PRICES: Record<string, { in: number; out: number; cacheRead: number; cacheWrite: number }> = {
  'claude-haiku-4-5': { in: 1.0, out: 5.0, cacheRead: 0.1, cacheWrite: 1.25 },
  'claude-sonnet-4-6': { in: 3.0, out: 15.0, cacheRead: 0.3, cacheWrite: 3.75 },
};

/** The shape Anthropic returns. Fields are optional because older/other models may omit the cache ones. */
export interface AnthropicUsage {
  input_tokens?: number;
  output_tokens?: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Record one call. FIRE AND FORGET -- callers must NOT await this and must not let it affect the reply.
 *
 * @param feature  'otto' | 'halo' | 'coach' | 'estimator' -- whatever the caller calls itself
 * @param uid      the signed-in user
 * @param model    the model string actually used, so a Sonnet call is priced as Sonnet
 * @param usage    `response.usage` straight from the SDK
 */
export function recordUsage(
  feature: string,
  uid: string,
  model: string,
  usage: AnthropicUsage | undefined | null,
): void {
  try {
    if (!usage || !uid) return;
    const inTok = usage.input_tokens ?? 0;
    const outTok = usage.output_tokens ?? 0;
    const readTok = usage.cache_read_input_tokens ?? 0;
    const writeTok = usage.cache_creation_input_tokens ?? 0;

    const p = PRICES[model];
    const usd = p
      ? (inTok * p.in + outTok * p.out + readTok * p.cacheRead + writeTok * p.cacheWrite) / 1e6
      : 0;

    const inc = admin.firestore.FieldValue.increment;
    const date = todayKey();
    // One document per user per day. Per-user rather than one global doc on purpose: a single shared
    // counter would hit Firestore's sustained per-document write limit once traffic is real.
    admin
      .firestore()
      .collection('ai_cost')
      .doc(`${uid}_${date}`)
      .set(
        {
          uid,
          date,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          totals: {
            calls: inc(1), inputTokens: inc(inTok), outputTokens: inc(outTok),
            cacheReadTokens: inc(readTok), cacheWriteTokens: inc(writeTok), usd: inc(usd),
          },
          byFeature: {
            [feature]: {
              calls: inc(1), inputTokens: inc(inTok), outputTokens: inc(outTok),
              cacheReadTokens: inc(readTok), cacheWriteTokens: inc(writeTok), usd: inc(usd),
              model,
            },
          },
        },
        { merge: true },
      )
      .catch((e) => console.error('[aiUsageMeter] write failed', { feature, msg: (e as Error)?.message }));
  } catch (e) {
    // A metering failure must never surface to the user or break the AI reply.
    console.error('[aiUsageMeter] threw', { feature, msg: (e as Error)?.message });
  }
}

/**
 * PLAN.md 4.5 INSTRUMENTATION. How much of a message's full-price input is the conversation being
 * re-sent? Otto has no memory, so the last `MAX_HISTORY_TURNS` messages ride along on every new one and
 * are paid for again each time. Nobody has ever measured what that costs.
 *
 * ⚠️ MEASUREMENT ONLY. Changes nothing about what Otto is sent or how he answers. It exists so the cap can
 * be tuned against a reading instead of an opinion -- cutting it blind trades money we have not confirmed
 * we are spending for Otto losing the thread mid-conversation, which is a worse app.
 *
 * ⚠️ `historyTokens` is a SUBTRACTION, so it carries a few tokens of request overhead either way. Read it
 * as a share of the bill, not to the token. `historySamples` is the divisor -- **average history per
 * message is `historyTokens / historySamples`, NOT `historyTokens / calls`**, because a message with no
 * history yet is deliberately not sampled.
 *
 * FIRE AND FORGET, same as `recordUsage`, and writes to the same per-day document.
 */
export function recordHistorySample(
  feature: string,
  uid: string,
  historyTokens: number,
  historyTurns: number,
): void {
  try {
    if (!uid || !(historyTokens > 0)) return;
    const inc = admin.firestore.FieldValue.increment;
    const date = todayKey();
    admin
      .firestore()
      .collection('ai_cost')
      .doc(`${uid}_${date}`)
      .set(
        {
          uid,
          date,
          byFeature: {
            [feature]: {
              historyTokens: inc(historyTokens),
              historyTurns: inc(historyTurns),
              historySamples: inc(1),
            },
          },
        },
        { merge: true },
      )
      .catch((e) => console.error('[aiUsageMeter] history write failed', { feature, msg: (e as Error)?.message }));
  } catch (e) {
    console.error('[aiUsageMeter] history threw', { feature, msg: (e as Error)?.message });
  }
}
