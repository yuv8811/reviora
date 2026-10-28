import { authenticate, sessionStorage } from "../shopify.server";
import { connectDB } from "../db.server";
import { StoreReviews } from "../models/review.model";
import { ReviewRequest } from "../models/reviewRequest.model";

/**
 * Unified Compliance Webhooks Handler for /webhooks/compliance
 * Supports customers/data_request, customers/redact, and shop/redact.
 */
export const action = async ({ request }) => {
  const { shop, topic, payload } = await authenticate.webhook(request);

  console.log(`[Unified Compliance] Received ${topic} for shop: ${shop}`);

  try {
    await connectDB();

    switch (topic) {
      case "CUSTOMERS_DATA_REQUEST":
      case "customers/data_request": {
        const customerEmail = payload?.customer?.email;
        console.log(`[Compliance] Handled data request for customer ${customerEmail} on ${shop}`);
        break;
      }

      case "CUSTOMERS_REDACT":
      case "customers/redact": {
        const customerEmail = payload?.customer?.email;
        if (customerEmail) {
          await StoreReviews.updateOne(
            { shop },
            {
              $pull: {
                reviews: {
                  authorEmail: { $regex: new RegExp(`^${customerEmail}$`, "i") },
                },
              },
            }
          );
          await ReviewRequest.deleteMany({
            shop,
            customerEmail: { $regex: new RegExp(`^${customerEmail}$`, "i") },
          });
          console.log(`[Compliance] Redacted customer ${customerEmail} on ${shop}`);
        }
        break;
      }

      case "SHOP_REDACT":
      case "shop/redact": {
        await StoreReviews.deleteOne({ shop });
        await ReviewRequest.deleteMany({ shop });
        if (sessionStorage) {
          const sessions = await sessionStorage.findSessionsByShop(shop);
          if (sessions && sessions.length > 0) {
            await sessionStorage.deleteSessions(sessions.map((s) => s.id));
          }
        }
        console.log(`[Compliance] Erased all records for shop ${shop}`);
        break;
      }

      default:
        console.warn(`[Compliance] Unrecognized compliance topic: ${topic}`);
    }
  } catch (error) {
    console.error(`[Compliance Error] Processing topic ${topic}:`, error);
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
