import { authenticate } from "../shopify.server";
import { connectDB } from "../db.server";
import { StoreReviews } from "../models/review.model";
import { ReviewRequest } from "../models/reviewRequest.model";

/**
 * Mandatory Compliance Webhook: customers/data_request
 * Triggered when a customer requests a copy of their data stored by your app.
 */
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
    console.error("[Compliance Error] customers/data_request authentication error:", error);
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  console.log(`[Compliance] Received ${topic} for shop: ${shop}`);

  try {
    const customerEmail = payload?.customer?.email;
    const customerId = payload?.customer?.id;

    console.log(`[Compliance] Customer data request for email: ${customerEmail}, ID: ${customerId}`);

    // Fetch and log records for audit compliance
    if (customerEmail) {
      await connectDB();
      const storeDoc = await StoreReviews.findOne({ shop });
      const matchedReviews = storeDoc?.reviews?.filter(
        (r) => r.authorEmail?.toLowerCase() === customerEmail.toLowerCase()
      ) || [];

      const requests = await ReviewRequest.find({
        shop,
        customerEmail: { $regex: new RegExp(`^${customerEmail}$`, "i") },
      });

      console.log(
        `[Compliance] Found ${matchedReviews.length} reviews and ${requests.length} requests for customer data request.`
      );
    }
  } catch (error) {
    console.error("[Compliance Error] customers/data_request handling error:", error);
  }

  // Must always respond with 200 series status code
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
