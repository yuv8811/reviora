import { authenticate } from "../shopify.server";
import { connectDB } from "../db.server";
import { StoreReviews } from "../models/review.model";
import { ReviewRequest } from "../models/reviewRequest.model";

/**
 * Mandatory Compliance Webhook: customers/redact
 * Triggered when a store owner requests data deletion on behalf of a customer.
 */
export const action = async ({ request }) => {
  const { shop, topic, payload } = await authenticate.webhook(request);

  console.log(`[Compliance] Received ${topic} for shop: ${shop}`);

  try {
    const customerEmail = payload?.customer?.email;
    const customerId = payload?.customer?.id;

    console.log(`[Compliance] Redacting customer data: ${customerEmail || customerId}`);

    if (customerEmail) {
      await connectDB();

      // Anonymize or remove reviews authored by this customer email
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

      // Remove any pending/scheduled review requests
      await ReviewRequest.deleteMany({
        shop,
        customerEmail: { $regex: new RegExp(`^${customerEmail}$`, "i") },
      });

      console.log(`[Compliance] Successfully redacted customer data for ${customerEmail}`);
    }
  } catch (error) {
    console.error("[Compliance Error] customers/redact handling error:", error);
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
