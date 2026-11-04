import { authenticate } from "../shopify.server.js";
import { updateShopSettings } from "../models/review.server.js";
import { sendSlackNotification } from "../services/slack.server.js";

export const action = async ({ request }) => {
  let shop, topic, payload;

  try {
    const authResult = await authenticate.webhook(request);
    shop = authResult.shop;
    topic = authResult.topic;
    payload = authResult.payload;
  } catch (error) {
    if (error instanceof Response && (error.status === 401 || error.status === 400)) {
      throw error;
    }
    console.error("Error authenticating app_subscriptions/update webhook:", error);
    return new Response(null, { status: 200 });
  }

  console.log(`[Webhook] Received ${topic} for ${shop}:`, payload);

  const sub = payload?.app_subscription;
  const status = sub?.status; // ACTIVE, CANCELLED, DECLINED, EXPIRED, FROZEN
  const name = sub?.name || "Pro";

  if (status === "ACTIVE") {
    try {
      await updateShopSettings(shop, { plan: "PRO" });
      sendSlackNotification({
        text: `🎉 *New Pro Subscription!* Store *${shop}* just activated their *${name}* subscription!`,
      }).catch((err) => console.error("[Slack] Webhook subscription alert error:", err));
    } catch (err) {
      console.error(`[Webhook] Error activating PRO for ${shop}:`, err);
    }
  } else if (["CANCELLED", "DECLINED", "EXPIRED", "FROZEN"].includes(status)) {
    try {
      await updateShopSettings(shop, { plan: "FREE" });
      sendSlackNotification({
        text: `⚠️ *Subscription Update:* Store *${shop}* subscription *${name}* status changed to *${status}*. Reverted to Free plan.`,
      }).catch((err) => console.error("[Slack] Webhook cancellation alert error:", err));
    } catch (err) {
      console.error(`[Webhook] Error reverting ${shop} to Free:`, err);
    }
  }

  return new Response(null, { status: 200 });
};

