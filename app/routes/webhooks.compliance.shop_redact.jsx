import { authenticate, sessionStorage } from "../shopify.server";
import { connectDB } from "../db.server";
import { StoreReviews } from "../models/review.model";
import { ReviewRequest } from "../models/reviewRequest.model";

/**
 * Mandatory Compliance Webhook: shop/redact
 * 48 hours after an app is uninstalled, Shopify sends this webhook.
 * All data related to the merchant shop must be permanently erased.
 */
export const action = async ({ request }) => {
  let shop, topic;

  try {
    const authResult = await authenticate.webhook(request);
    shop = authResult.shop;
    topic = authResult.topic;
  } catch (error) {
    if (error instanceof Response && (error.status === 401 || error.status === 400)) {
      throw error;
    }
    console.error("[Compliance Error] shop/redact authentication error:", error);
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  console.log(`[Compliance] Received ${topic} for shop: ${shop}. Erasing all shop data.`);

  try {
    await connectDB();

    // 1. Delete all reviews for this shop
    await StoreReviews.deleteOne({ shop });

    // 2. Delete all review requests
    await ReviewRequest.deleteMany({ shop });

    // 3. Delete sessions
    if (sessionStorage) {
      const sessions = await sessionStorage.findSessionsByShop(shop);
      if (sessions && sessions.length > 0) {
        const sessionIds = sessions.map((s) => s.id);
        await sessionStorage.deleteSessions(sessionIds);
      }
    }

    console.log(`[Compliance] Successfully erased all data for shop: ${shop}`);
  } catch (error) {
    console.error("[Compliance Error] shop/redact handling error:", error);
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
