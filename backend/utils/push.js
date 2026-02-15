import webpush from 'web-push';

export function initWebPush() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const contact = process.env.VAPID_CONTACT || 'mailto:admin@example.com';

  if (!publicKey || !privateKey) {
    console.warn('[push] VAPID keys not set. Generate with `npx web-push generate-vapid-keys` and set VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY in env.');
    return;
  }

  webpush.setVapidDetails(contact, publicKey, privateKey);
}

export async function sendPush(subscription, payload) {
  try {
    return await webpush.sendNotification(subscription, JSON.stringify(payload));
  } catch (err) {
    console.error('[push] sendPush error:', err);
    throw err;
  }
}

export function getVapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY || null;
}
