import { getPublicStorefrontQA, createQuestion } from "../models/qa.server.js";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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

  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  const productId = url.searchParams.get("productId") || "all";

  if (!shop) {
    return Response.json(
      { error: "shop query parameter is required" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  try {
    const questions = await getPublicStorefrontQA(shop, productId);
    return Response.json({ questions }, { headers: CORS_HEADERS });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500, headers: CORS_HEADERS });
  }
};

export const action = async ({ request }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: CORS_HEADERS });
  }

  try {
    const payload = await request.json();
    const { shop, productId, productHandle, productTitle, question, askerName, askerEmail } = payload;

    if (!shop || !productId || !question || !askerName || !askerEmail) {
      return Response.json(
        { error: "Missing required fields (shop, productId, question, askerName, askerEmail)" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const created = await createQuestion({
      shop,
      productId,
      productHandle,
      productTitle,
      question,
      askerName,
      askerEmail,
    });

    return Response.json({ success: true, question: created }, { status: 201, headers: CORS_HEADERS });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500, headers: CORS_HEADERS });
  }
};
