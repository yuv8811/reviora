import { StoreReviews } from "../models/review.model.js";
import { connectDB } from "../db.server.js";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept",
  "Access-Control-Max-Age": "86400",
};

export const options = () => {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
};

export const loader = async ({ request }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  return Response.json({ error: "Method not allowed" }, { status: 405, headers: CORS_HEADERS });
};

export const action = async ({ params, request }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: CORS_HEADERS });
  }

  const { reviewId } = params;
  if (!reviewId) {
    return Response.json({ error: "reviewId required" }, { status: 400, headers: CORS_HEADERS });
  }

  try {
    await connectDB();
    const updated = await StoreReviews.findOneAndUpdate(
      { "reviews._id": reviewId },
      { $inc: { "reviews.$.helpfulCount": 1 } },
      { new: true }
    );

    if (!updated) {
      return Response.json({ error: "Review not found" }, { status: 404, headers: CORS_HEADERS });
    }

    const review = updated.reviews.find((r) => r._id.toString() === reviewId);
    return Response.json(
      { success: true, helpfulCount: review ? review.helpfulCount : 0 },
      { headers: CORS_HEADERS }
    );
  } catch (error) {
    return Response.json(
      { error: "Review not found or could not be updated" },
      { status: 404, headers: CORS_HEADERS }
    );
  }
};
