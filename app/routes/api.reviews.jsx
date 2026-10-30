import { getStorefrontReviews, createReview } from "../models/review.server.js";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept",
  "Access-Control-Max-Age": "86400",
};

/**
 * Handle preflight OPTIONS requests for storefront widgets
 */
export const options = () => {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
};

/**
 * GET /api/reviews?shop=...&productId=...&sort=...&rating=...
 */
export const loader = async ({ request }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  const productId = url.searchParams.get("productId") || "all";
  const sort = url.searchParams.get("sort") || "newest";
  const rating = url.searchParams.get("rating");
  const hasMedia = url.searchParams.get("hasMedia") === "true";
  const limit = url.searchParams.get("limit") ? Number(url.searchParams.get("limit")) : null;

  if (!shop) {
    return Response.json(
      { error: "shop query parameter is required" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  try {
    const data = await getStorefrontReviews(shop, productId, { sort, rating, hasMedia, limit });
    return Response.json(data, { headers: CORS_HEADERS });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500, headers: CORS_HEADERS });
  }
};

/**
 * POST /api/reviews - Customer review submission
 */
export const action = async ({ request }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: CORS_HEADERS });
  }

  try {
    const payload = await request.json();
    const { shop, productId, productHandle, productTitle, rating, title, body, authorName, authorEmail, mediaUrls } = payload;

    const finalProductId = productHandle || productId;
    if (!shop || !finalProductId || !rating || !body || !authorName || !authorEmail) {
      return Response.json({ error: "Missing required fields" }, { status: 400, headers: CORS_HEADERS });
    }

    const review = await createReview({
      shop,
      productId: finalProductId,
      productHandle: productHandle || finalProductId,
      productTitle,
      rating: Number(rating),
      title,
      body,
      authorName,
      authorEmail,
      mediaUrls: mediaUrls || [],
    });

    return Response.json({ success: true, review }, { status: 201, headers: CORS_HEADERS });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500, headers: CORS_HEADERS });
  }
};
