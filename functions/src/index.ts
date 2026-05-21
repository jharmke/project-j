import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import * as jwt from 'jsonwebtoken';
import * as nodemailer from 'nodemailer';

admin.initializeApp();

const APPLE_PRIVATE_KEY = defineSecret('APPLE_PRIVATE_KEY');
const GMAIL_APP_PASSWORD = defineSecret('GMAIL_APP_PASSWORD');

const APPLE_TEAM_ID = '8A8F5933RX';
const APPLE_KEY_ID = 'NCBCD37N9W';
const APPLE_CLIENT_ID = 'com.jharmke.projectj';

function generateAppleClientSecret(privateKey: string): string {
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    {
      iss: APPLE_TEAM_ID,
      iat: now,
      exp: now + 15776000, // 6 months max per Apple spec
      aud: 'https://appleid.apple.com',
      sub: APPLE_CLIENT_ID,
    },
    privateKey,
    { algorithm: 'ES256', keyid: APPLE_KEY_ID }
  );
}

// Called immediately after Apple sign-in to exchange the one-time authorizationCode
// for a refresh_token stored in Firestore. Fire-and-forget from client --
// failure here never blocks sign-in or any other flow.
export const exchangeAppleCode = onCall(
  { secrets: [APPLE_PRIVATE_KEY] },
  async (request) => {
    if (!request.auth) return { success: false };

    const { authorizationCode } = request.data as { authorizationCode: string };
    if (!authorizationCode) return { success: false };

    const privateKey = APPLE_PRIVATE_KEY.value();

    try {
      const clientSecret = generateAppleClientSecret(privateKey);
      const response = await fetch('https://appleid.apple.com/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: APPLE_CLIENT_ID,
          client_secret: clientSecret,
          code: authorizationCode,
          grant_type: 'authorization_code',
        }).toString(),
      });

      const tokenData = await response.json() as { refresh_token?: string };
      if (!tokenData.refresh_token) return { success: false };

      await admin.firestore()
        .collection('users')
        .doc(request.auth.uid)
        .set({ appleRefreshToken: tokenData.refresh_token }, { merge: true });

      return { success: true };
    } catch {
      return { success: false };
    }
  }
);

// Called at account deletion. Runs server-side with admin privileges --
// bypasses requires-recent-login entirely. Handles Apple revocation,
// Firestore cleanup, and Firebase Auth deletion in one atomic server call.
export const deleteAccount = onCall(
  { secrets: [APPLE_PRIVATE_KEY] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be signed in');
    }

    const uid = request.auth.uid;
    const privateKey = APPLE_PRIVATE_KEY.value();

    // Step 1: Revoke Apple refresh token (best effort -- non-fatal if missing or fails)
    try {
      const userDoc = await admin.firestore().collection('users').doc(uid).get();
      const appleRefreshToken = userDoc.data()?.appleRefreshToken as string | undefined;

      if (appleRefreshToken) {
        const clientSecret = generateAppleClientSecret(privateKey);
        await fetch('https://appleid.apple.com/auth/revoke', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: APPLE_CLIENT_ID,
            client_secret: clientSecret,
            token: appleRefreshToken,
            token_type_hint: 'refresh_token',
          }).toString(),
        });
      }
    } catch { /* non-fatal */ }

    // Step 2: Delete all Firestore store/* docs
    try {
      const storeDocs = await admin.firestore()
        .collection('users').doc(uid)
        .collection('store')
        .get();
      await Promise.all(storeDocs.docs.map(d => d.ref.delete()));
    } catch { /* non-fatal */ }

    // Step 3: Delete the users/{uid} root doc (holds appleRefreshToken)
    try {
      await admin.firestore().collection('users').doc(uid).delete();
    } catch { /* non-fatal */ }

    // Step 4: Delete Firebase Auth user -- admin SDK requires no recent login
    await admin.auth().deleteUser(uid);

    return { success: true };
  }
);

// Saves prayer request to Firestore and emails the developer.
// Email is best-effort -- request is always persisted even if email fails.
export const sendPrayerRequest = onCall(
  { secrets: [GMAIL_APP_PASSWORD] },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Must be signed in');

    const { message, userName, userEmail } = request.data as {
      message: string;
      userName: string;
      userEmail: string;
    };

    if (!message?.trim()) throw new HttpsError('invalid-argument', 'Message required');

    await admin.firestore().collection('prayer_requests').add({
      uid: request.auth.uid,
      userName: userName || '',
      userEmail: userEmail || '',
      message: message.trim(),
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: 'jtharmke@gmail.com', pass: GMAIL_APP_PASSWORD.value() },
      });
      await transporter.sendMail({
        from: '"Project J" <jtharmke@gmail.com>',
        to: 'jtharmke@gmail.com',
        subject: `Prayer Request -- ${userName || 'App User'}`,
        text: `From: ${userName || 'Anonymous'}${userEmail ? ` (${userEmail})` : ''}\n\n${message.trim()}`,
      });
    } catch (e) {
      console.error('Email send failed (request still saved to Firestore):', e);
    }

    return { success: true };
  }
);
