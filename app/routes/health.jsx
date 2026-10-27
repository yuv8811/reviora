import { connectDB } from "../db.server.js";
import process from 'process'

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept",
  "Access-Control-Max-Age": "86400",
  "Cache-Control": "no-cache, no-store, must-revalidate",
};

export const options = () => {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
};

export const loader = async ({ request }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  let dbStatus = "unknown";

  try {
    if (process.env.MONGODB_URI) {
      await connectDB();
      dbStatus = "connected";
    } else {
      dbStatus = "not_configured";
    }
  } catch (err) {
    dbStatus = `disconnected (${err.message})`;
  }

  const payload = {
    status: "ok",
    service: "Reviora Shopify App",
    uptimeSeconds: Math.floor(process.uptime()),
    database: dbStatus,
    timestamp: new Date().toISOString(),
  };

  // Support HEAD requests for ping monitors
  if (request.method === "HEAD") {
    return new Response(null, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "application/json",
      },
    });
  }

  return Response.json(payload, {
    status: 200,
    headers: CORS_HEADERS,
  });
};
