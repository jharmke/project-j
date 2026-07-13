import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';
import { recordMembershipEvent, REVENUECAT_SECRET_KEY } from './membership';

// ─── RevenueCat webhook -> email Justin ──────────────────────────────────────
// Fires when someone becomes a Supporter or leaves a tip, so the thank-you can be hand-written.
// Deliberately QUIET: only the two events worth a personal note are emailed. Renewals,
// cancellations and expirations are acknowledged (200) and dropped -- a monthly email per
// subscriber would train Justin to ignore these.
//
// SECURITY: the function URL is public, so without a check anyone could POST fake "new supporter"
// mail at it. RevenueCat lets you set an Authorization header on the webhook; we require it to match
// REVENUECAT_WEBHOOK_TOKEN and 401 anything else.
//
// Set the secret before deploying:
//   firebase functions:secrets:set REVENUECAT_WEBHOOK_TOKEN
// then paste the SAME value into RevenueCat > Integrations > Webhooks > Authorization header.

const GMAIL_APP_PASSWORD = defineSecret('GMAIL_APP_PASSWORD');
const REVENUECAT_WEBHOOK_TOKEN = defineSecret('REVENUECAT_WEBHOOK_TOKEN');

// Only these two get a personal note. Everything else is a no-op.
const INITIAL_PURCHASE = 'INITIAL_PURCHASE';        // new Supporter (monthly or annual)
const NON_RENEWING_PURCHASE = 'NON_RENEWING_PURCHASE'; // a tip (consumable)

// Product id -> what Justin actually calls it. Falls back to the raw id if a new product appears.
const PRODUCT_NAMES: Record<string, string> = {
  supporter_monthly: 'Supporter (monthly)',
  supporter_annual: 'Supporter (annual)',
  tip_pitchin: 'Tip: Pitch In',
  tip_addfuel: 'Tip: Add Fuel',
  tip_powerforward: 'Tip: Power Forward',
  tip_backmission: 'Tip: Back the Mission',
};

// The buyer's app_user_id IS their Firebase uid (the client calls Purchases.logIn(uid)), so the
// person can be named. Without this the email would just say "someone subscribed" -- useless for a
// hand-written thank-you. Best-effort: an anonymous / pre-login purchase still sends, just unnamed.
async function describeBuyer(appUserId: string | undefined): Promise<string> {
  if (!appUserId) return 'Unknown user (no app_user_id on the event)';
  try {
    const user = await admin.auth().getUser(appUserId);
    const name = user.displayName || '(no name set)';
    const email = user.email || '(no email on file)';
    return `${name}\nEmail: ${email}\nUID:   ${appUserId}`;
  } catch {
    // Anonymous RevenueCat id, or a uid that no longer exists in Auth.
    return `Could not look up this user in Firebase Auth.\nUID: ${appUserId}`;
  }
}

export const revenueCatWebhook = onRequest(
  { secrets: [GMAIL_APP_PASSWORD, REVENUECAT_WEBHOOK_TOKEN, REVENUECAT_SECRET_KEY] },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed');
      return;
    }

    // Shared-secret check. RevenueCat sends whatever we configure as the Authorization header.
    if (req.header('Authorization') !== REVENUECAT_WEBHOOK_TOKEN.value()) {
      console.warn('RevenueCat webhook: rejected a request with a bad/missing Authorization header');
      res.status(401).send('Unauthorized');
      return;
    }

    const event = req.body?.event;
    if (!event) {
      res.status(200).send('No event in body; nothing to do');
      return;
    }

    const type: string = event.type;

    // FIRST, on EVERY event: record the subscription state server-side. The AI caps read this to decide
    // who's a Supporter, and it must never be taken on the client's word (a spoofed client would run up
    // the Anthropic bill). This deliberately runs for renewals, cancellations and expirations too --
    // events we don't email about, but whose state the caps absolutely depend on. Tips are ignored here:
    // they aren't in the `supporter` entitlement, so recordMembershipEvent skips them.
    await recordMembershipEvent(event);

    // PROMOTIONAL grants (how testers are handed a free Supporter entitlement) arrive as
    // NON_RENEWING_PURCHASE -- the same event type as a TIP. Without this guard, granting testers emails
    // Justin "Someone left a tip... $0... time to write the thank-you" once per tester. Seen live.
    if (event.store === 'PROMOTIONAL' || String(event.product_id || '').startsWith('rc_promo_')) {
      res.status(200).send('Promotional grant: recorded, no email');
      return;
    }

    if (type !== INITIAL_PURCHASE && type !== NON_RENEWING_PURCHASE) {
      // Recorded above; nothing to email. Acknowledge so RevenueCat doesn't retry.
      res.status(200).send(`Recorded, no email for event type: ${type}`);
      return;
    }

    const isTip = type === NON_RENEWING_PURCHASE;
    const productId: string = event.product_id || '(unknown product)';
    const productName = PRODUCT_NAMES[productId] || productId;
    // SANDBOX vs PRODUCTION -- so a test purchase never reads like a real one.
    const isSandbox = event.environment === 'SANDBOX';
    const price = event.price != null ? `${event.price} ${event.currency || ''}`.trim() : '(no price on event)';
    const store: string = event.store || '(unknown store)';
    const country: string = event.country_code || '(unknown)';
    const when = event.purchased_at_ms ? new Date(event.purchased_at_ms).toISOString() : '(no timestamp)';

    const buyer = await describeBuyer(event.app_user_id);

    const headline = isTip ? 'Someone left a tip' : 'New Supporter';
    const subject = `${isSandbox ? '[SANDBOX] ' : ''}${headline} -- ${productName}`;
    const text = [
      headline,
      '',
      `Who:      ${buyer}`,
      '',
      `What:     ${productName} (${productId})`,
      `Price:    ${price}`,
      `Store:    ${store}`,
      `Country:  ${country}`,
      `When:     ${when}`,
      `Env:      ${event.environment || '(unknown)'}`,
      '',
      isSandbox
        ? 'This was a SANDBOX purchase (a test). No real money changed hands.'
        : 'This is a REAL purchase. Time to write the thank-you.',
    ].join('\n');

    // Email is best-effort and we STILL return 200: a non-2xx makes RevenueCat retry, and a Gmail
    // hiccup should not turn into a retry storm. Failures are logged instead.
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: 'jtharmke@gmail.com', pass: GMAIL_APP_PASSWORD.value() },
      });
      await transporter.sendMail({
        from: '"Project J" <jtharmke@gmail.com>',
        to: 'dev.harmke@gmail.com',
        subject,
        text,
      });
    } catch (e) {
      console.error('RevenueCat webhook: email send failed (event still acknowledged):', e);
    }

    res.status(200).send('ok');
  }
);
