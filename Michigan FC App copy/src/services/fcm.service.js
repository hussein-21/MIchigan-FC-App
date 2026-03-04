const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const config = require('../config');

let initialised = false;

function initFirebase() {
  if (initialised) return;
  const saPath = config.firebase.serviceAccountPath;
  if (!saPath) {
    console.warn('[FCM] FIREBASE_SERVICE_ACCOUNT_PATH not set – push notifications disabled.');
    return;
  }
  try {
    const abs = path.isAbsolute(saPath) ? saPath : path.resolve(process.cwd(), saPath);
    const sa = JSON.parse(fs.readFileSync(abs, 'utf8'));
    admin.initializeApp({ credential: admin.credential.cert(sa) });
    initialised = true;
    console.log('[FCM] Firebase Admin initialised.');
  } catch (err) {
    console.warn('[FCM] Could not initialise Firebase:', err.message);
  }
}

/**
 * Best-effort push to an array of FCM tokens.
 * Never throws – all errors are caught and logged.
 */
async function sendPush(tokens, payload) {
  if (!initialised || !tokens.length) return null;
  try {
    const resp = await admin.messaging().sendEachForMulticast({
      notification: { title: payload.title, body: payload.message },
      tokens,
    });
    console.log(`[FCM] ${resp.successCount} ok, ${resp.failureCount} failed`);
    return resp;
  } catch (err) {
    console.error('[FCM] sendPush error:', err.message);
    return null;
  }
}

module.exports = { initFirebase, sendPush };
