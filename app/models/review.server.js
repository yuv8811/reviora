import mongoose from "mongoose";
import { connectDB } from "../db.server.js";
import { StoreReviews } from "./review.model.js";
import { ReviewRequest } from "./reviewRequest.model.js";
import { uploadToCloudinary } from "../utils/cloudinary.server.js";
import { unauthenticated } from "../shopify.server.js";
import { SET_PRODUCT_METAFIELDS_MUTATION, GET_PRODUCT_ID_BY_HANDLE_QUERY } from "../graphql/custom_metafield.js";

/**
 * Verify whether an authorEmail belongs to an existing customer with orders in Shopify
 * or has an existing order review request in this shop.
 */
export async function verifyCustomerByEmail(shop, email, adminClient = null) {
  if (!email || !email.trim() || !shop) return false;
  const cleanEmail = email.trim().toLowerCase();

  try {
    await connectDB();
    // 1. Fast check in local ReviewRequest database (fulfilled/delivered orders)
    const hasRequest = await ReviewRequest.exists({
      shop,
      customerEmail: { $regex: new RegExp(`^${cleanEmail}$`, "i") },
    });
    if (hasRequest) return true;
  } catch (err) {
    console.warn("Could not check ReviewRequest for email verification:", err?.message || err);
  }

  // 2. Query Shopify orders for this email via Admin GraphQL
  try {
    let admin = adminClient;
    if (!admin) {
      const auth = await unauthenticated.admin(shop);
      admin = auth?.admin;
    }

    if (admin) {
      const response = await admin.graphql(
        `#graphql
        query checkCustomerPurchased($query: String!) {
          orders(first: 1, query: $query) {
            nodes {
              id
            }
          }
        }`,
        {
          variables: {
            query: `email:${cleanEmail}`,
          },
        }
      );

      const json = await response.json();
      const orders = json.data?.orders?.nodes || [];
      if (orders.length > 0) {
        return true;
      }
    }
  } catch (err) {
    console.warn(`Customer order check for "${cleanEmail}" failed:`, err?.message || err);
  }

  return false;
}

/**
 * Fetch or initialize default settings for a given shop using StoreReviews
 */
export async function getShopSettings(shop) {
  await connectDB();
  let storeDoc = await StoreReviews.findOne({ shop });

  if (!storeDoc) {
    try {
      storeDoc = await StoreReviews.create({
        shop,
        reviews: [],
        plan: "FREE",
        widgetSettings: {},
        onboardingStep: 1,
        onboardingCompleted: false,
      });
    } catch {
      storeDoc = await StoreReviews.findOne({ shop });
    }
  }

  const doc = storeDoc?.toObject ? storeDoc.toObject({ virtuals: true }) : storeDoc || {};

  return {
    shop,
    plan: doc.plan || "FREE",
    widgetSettings: doc.widgetSettings || {},
    onboardingStep: doc.onboardingStep || 1,
    onboardingCompleted: Boolean(doc.onboardingCompleted),
    primaryColor: doc.widgetSettings?.primaryColor || "#FFB800",
    badgeColor: doc.widgetSettings?.badgeColor || "#10B981",
    autoPublish: true,
    minAutoPublishRating: 4,
    enableAiFeatures: true,
  };
}

/**
 * Update shop settings stored directly on StoreReviews
 */
export async function updateShopSettings(shop, data) {
  await connectDB();
  const updated = await StoreReviews.findOneAndUpdate(
    { shop },
    { $set: data },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  const doc = updated?.toObject ? updated.toObject({ virtuals: true }) : updated || {};
  return {
    shop,
    plan: doc.plan || "FREE",
    widgetSettings: doc.widgetSettings || {},
    onboardingStep: doc.onboardingStep || 1,
    onboardingCompleted: Boolean(doc.onboardingCompleted),
    primaryColor: doc.widgetSettings?.primaryColor || "#FFB800",
    badgeColor: doc.widgetSettings?.badgeColor || "#10B981",
    autoPublish: true,
    minAutoPublishRating: 4,
    enableAiFeatures: true,
  };
}

/**
 * Update widget-specific settings for a shop
 */
export async function updateWidgetSettings(shop, widgetId, widgetData) {
  await connectDB();
  const current = await getShopSettings(shop);
  const updatedWidgets = {
    ...(current?.widgetSettings || {}),
    [widgetId]: {
      ...((current?.widgetSettings && current.widgetSettings[widgetId]) || {}),
      ...widgetData,
    },
  };
  return updateShopSettings(shop, { widgetSettings: updatedWidgets });
}


/**
 * Fetch reviews for admin moderation with filters & pagination
 */
export async function getAdminReviews(shop, { status, rating, search, page = 1, limit = 20 } = {}) {
  await connectDB();
  const storeDoc = await StoreReviews.findOne({ shop }).lean({ virtuals: true });

  let allReviews = (storeDoc?.reviews || []).map((r) => ({
    ...r,
    id: r.id || r._id?.toString(),
    media: (r.media || []).map((m) => ({ ...m, id: m.id || m._id?.toString() })),
    replies: (r.replies || []).map((rep) => ({ ...rep, id: rep.id || rep._id?.toString() })),
  }));

  // Filtering
  if (status && status !== "ALL") {
    const sUpper = String(status).toUpperCase();
    allReviews = allReviews.filter((r) => String(r.status || "").toUpperCase() === sUpper);
  }

  if (rating) {
    allReviews = allReviews.filter((r) => Number(r.rating) === Number(rating));
  }

  if (search) {
    const s = String(search).toLowerCase().trim();
    allReviews = allReviews.filter((r) => {
      return (
        (r.authorName && r.authorName.toLowerCase().includes(s)) ||
        (r.authorEmail && r.authorEmail.toLowerCase().includes(s)) ||
        (r.title && r.title.toLowerCase().includes(s)) ||
        (r.body && r.body.toLowerCase().includes(s)) ||
        (r.productTitle && r.productTitle.toLowerCase().includes(s))
      );
    });
  }

  // Sort by createdAt descending
  allReviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const totalCount = allReviews.length;
  const skip = (page - 1) * limit;
  const paginatedReviews = allReviews.slice(skip, skip + limit);

  return {
    reviews: paginatedReviews,
    totalCount,
    totalPages: Math.ceil(totalCount / limit) || 1,
    currentPage: page,
  };
}

/**
 * Get aggregate dashboard metrics for a shop
 */
export async function getDashboardMetrics(shop) {
  await connectDB();
  const [storeDoc, totalRequests] = await Promise.all([
    StoreReviews.findOne({ shop }).lean({ virtuals: true }),
    ReviewRequest.countDocuments({ shop }),
  ]);

  const allReviews = storeDoc?.reviews || [];
  const totalReviews = allReviews.length;
  const publishedReviews = allReviews.filter((r) => (r.status || "").toUpperCase() === "PUBLISHED");
  const pendingReviews = allReviews.filter((r) => (r.status || "").toUpperCase() === "PENDING").length;

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let weightedSum = 0;

  publishedReviews.forEach((item) => {
    if (distribution[item.rating] !== undefined) {
      distribution[item.rating] += 1;
      weightedSum += item.rating;
    }
  });

  const pubCount = publishedReviews.length;
  const averageRating = pubCount > 0 ? (weightedSum / pubCount).toFixed(1) : "0.0";

  return {
    totalReviews,
    publishedReviews: pubCount,
    pendingReviews,
    averageRating: Number(averageRating),
    distribution,
    totalRequests,
  };
}

/**
 * Public storefront query for product reviews
 */
export async function getStorefrontReviews(shop, productId, { sort = "newest", rating, hasMedia = false, limit = null } = {}) {
  await connectDB();
  const storeDoc = await StoreReviews.findOne({ shop }).lean({ virtuals: true });
  const allReviews = storeDoc?.reviews || [];

  // Filter for matching product and published status (supports all products if "all" or omitted)
  const targetId = (productId && productId !== "all") ? String(productId).trim().toLowerCase() : null;
  let matchingReviews = allReviews.filter((r) => {
    if ((r.status || "").toUpperCase() !== "PUBLISHED") return false;
    if (!targetId) return true;
    const rProdId = String(r.productId || "").trim().toLowerCase();
    const rHandle = String(r.productHandle || "").trim().toLowerCase();
    return rProdId === targetId || rHandle === targetId;
  });

  // Calculate aggregates based on all published reviews for this product
  const total = matchingReviews.length;
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;

  matchingReviews.forEach((r) => {
    const numericRating = Math.round(Number(r.rating) || 5);
    if (distribution[numericRating] !== undefined) {
      distribution[numericRating] += 1;
      sum += numericRating;
    }
  });

  const averageRating = total > 0 ? +(sum / total).toFixed(1) : 0;

  // Additional filter for user queries
  if (rating) {
    matchingReviews = matchingReviews.filter((r) => r.rating === Number(rating));
  }

  if (hasMedia) {
    matchingReviews = matchingReviews.filter((r) => r.media && r.media.length > 0);
  }

  // Sort
  if (sort === "highest") {
    matchingReviews.sort((a, b) => b.rating - a.rating);
  } else if (sort === "lowest") {
    matchingReviews.sort((a, b) => a.rating - b.rating);
  } else if (sort === "helpful") {
    matchingReviews.sort((a, b) => (b.helpfulCount || 0) - (a.helpfulCount || 0));
  } else {
    matchingReviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  let reviews = matchingReviews.map((r) => ({
    ...r,
    id: r.id || r._id?.toString(),
    media: (r.media || []).map((m) => ({ ...m, id: m.id || m._id?.toString() })),
    replies: (r.replies || []).map((rep) => ({ ...rep, id: rep.id || rep._id?.toString() })),
  }));

  if (limit && Number(limit) > 0) {
    reviews = reviews.slice(0, Number(limit));
  }

  const settings = await getShopSettings(shop);
  const photoUploadsEnabled = settings.plan !== "FREE";

  return {
    reviews,
    stats: {
      total,
      averageRating,
      distribution,
      photoUploadsEnabled,
      plan: settings.plan,
    },
    settings: {
      primaryColor: settings.primaryColor,
      badgeColor: settings.badgeColor,
      widgetSettings: settings.widgetSettings || {},
    },
  };
}

/**
 * Create a new review into the shop's single document
 */
export async function createReview({
  shop,
  productId,
  productTitle,
  productHandle,
  orderId,
  rating,
  title,
  body,
  authorName,
  authorEmail,
  mediaUrls = [],
  verified = false,
}) {
  await connectDB();
  const settings = await getShopSettings(shop);

  // Simple profanity & spam check
  const spamKeywords = ["viagra", "casino", "free crypto", "buy followers", "loan instantly"];
  const lowerBody = (body || "").toLowerCase();
  const isSpam = spamKeywords.some((w) => lowerBody.includes(w));

  let status = "PENDING";
  let riskScore = 0.0;

  if (isSpam) {
    status = "FLAGGED";
    riskScore = 0.95;
  } else if (settings.autoPublish && rating >= settings.minAutoPublishRating) {
    status = "Published";
  }

  let sentiment = "NEUTRAL";
  if (rating >= 4) sentiment = "POSITIVE";
  else if (rating <= 2) sentiment = "NEGATIVE";

  // Process and upload any base64 media to Cloudinary if configured
  const media = [];
  for (const m of mediaUrls) {
    if (!m.url) continue;
    let finalUrl = m.url;
    let mediaType = m.type || (m.url.startsWith("data:video/") ? "VIDEO" : "PHOTO");

    // If it's a base64 data URI, upload to Cloudinary
    if (m.url.startsWith("data:")) {
      try {
        const cleanShop = (shop || "default").replace(/[^a-zA-Z0-9_-]/g, "_");
        const uploadResult = await uploadToCloudinary(m.url, {
          resource_type: mediaType === "VIDEO" ? "video" : "image",
          folder: `reviora/${cleanShop}/reviews`,
        });
        console.log("Cloudinary upload success:", uploadResult.url);
        finalUrl = uploadResult.url;
        mediaType = uploadResult.resourceType === "video" ? "VIDEO" : "PHOTO";
      } catch (err) {
        console.error("Cloudinary upload failed, falling back to original URL:", err);
      }
    }

    media.push({
      mediaType,
      url: finalUrl,
      thumbnailUrl: m.thumbnailUrl || finalUrl,
    });
  }

  // Verify if reviewer is an existing customer by email
  let isVerified = Boolean(verified);
  if (!isVerified && authorEmail) {
    isVerified = await verifyCustomerByEmail(shop, authorEmail);
  }

  const newReviewData = {
    productId: String(productId),
    productTitle,
    productHandle,
    orderId,
    rating: Number(rating),
    title,
    body,
    authorName,
    authorEmail,
    verified: isVerified,
    status,
    sentiment,
    riskScore,
    media,
    replies: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const updatedDoc = await StoreReviews.findOneAndUpdate(
    { shop },
    { $push: { reviews: newReviewData } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const createdReview = updatedDoc.reviews[updatedDoc.reviews.length - 1];
  const obj = createdReview.toObject ? createdReview.toObject({ virtuals: true }) : createdReview;

  // Auto-sync metafields if the new review is published
  if (status === "Published" && (newReviewData.productId || newReviewData.productHandle)) {
    syncProductReviewMetafields({
      shop,
      productId: newReviewData.productId,
      productHandle: newReviewData.productHandle,
    }).catch((err) => console.error("[Reviora] Auto-sync metafields error:", err));
  }

  return {
    ...obj,
    id: obj.id || obj._id.toString(),
  };
}

/**
 * Delete a specific review from the shop's review collection
 * @param {string} shop
 * @param {string} reviewId
 * @param {object} [adminClient]
 */
export async function deleteReview(shop, reviewId, adminClient = null) {
  await connectDB();
  const idStr = String(reviewId || "");
  const ids = [idStr];
  try {
    if (mongoose.Types.ObjectId.isValid(idStr)) {
      ids.push(new mongoose.Types.ObjectId(idStr));
    }
  } catch (e) {
    // ignore
  }

  const doc = await StoreReviews.findOne(
    { shop, "reviews._id": { $in: ids } },
    { "reviews.$": 1 }
  ).lean();
  const targetReview = doc?.reviews?.[0];

  const res = await StoreReviews.updateOne(
    { shop },
    { $pull: { reviews: { _id: { $in: ids } } } }
  );

  if (targetReview?.productId || targetReview?.productHandle) {
    syncProductReviewMetafields({
      shop,
      productId: targetReview.productId,
      productHandle: targetReview.productHandle,
      adminClient,
    }).catch((err) => console.error("[Reviora] Metafields sync on delete error:", err));
  }

  return { success: true, modifiedCount: res.modifiedCount };
}

/**
 * Sync product review metrics to Shopify Product Metafields
 * Namespace: reviora
 * Keys: reviews, rating, rating_count, distribution
 *
 * @param {object} params
 * @param {string} params.shop
 * @param {string} [params.productId]
 * @param {string} [params.productHandle]
 * @param {object} [params.adminClient]
 */
export async function syncProductReviewMetafields({
  shop,
  productId,
  productHandle,
  adminClient = null,
}) {
  if (!shop || (!productId && !productHandle)) return;

  try {
    await connectDB();

    // 1. Resolve Shopify Admin Client
    let admin = adminClient;
    if (!admin) {
      const auth = await unauthenticated.admin(shop);
      admin = auth?.admin;
    }
    if (!admin) {
      console.warn(`[Reviora Metafields] Could not resolve admin client for shop "${shop}"`);
      return;
    }

    // 2. Resolve Product GID
    let productGid = null;
    if (typeof productId === "string" && productId.startsWith("gid://shopify/Product/")) {
      productGid = productId;
    } else if (productId && /^\d+$/.test(String(productId).trim())) {
      productGid = `gid://shopify/Product/${String(productId).trim()}`;
    }

    const handleToQuery = productHandle || productId;
    if (!productGid && handleToQuery) {
      try {
        const queryRes = await admin.graphql(GET_PRODUCT_ID_BY_HANDLE_QUERY, {
          variables: { handle: String(handleToQuery) },
        });
        const queryJson = await queryRes.json();
        productGid = queryJson?.data?.productByIdentifier?.id || null;
      } catch (err) {
        console.warn(`[Reviora Metafields] Failed to resolve product by handle "${handleToQuery}":`, err?.message || err);
      }
    }

    if (!productGid) {
      console.warn(`[Reviora Metafields] Unable to determine product GID for: ${productId || productHandle}`);
      return;
    }

    // 3. Fetch published reviews for this product
    const storeDoc = await StoreReviews.findOne({ shop }).lean();
    const allReviews = storeDoc?.reviews || [];

    const targetId = String(productId || "").trim().toLowerCase();
    const targetHandle = String(productHandle || "").trim().toLowerCase();

    const matchingPublished = allReviews.filter((r) => {
      if ((r.status || "").toUpperCase() !== "PUBLISHED") return false;
      const rProdId = String(r.productId || "").trim().toLowerCase();
      const rHandle = String(r.productHandle || "").trim().toLowerCase();
      return (
        (targetId && (rProdId === targetId || rHandle === targetId)) ||
        (targetHandle && (rProdId === targetHandle || rHandle === targetHandle))
      );
    });

    // 4. Calculate metrics
    const total = matchingPublished.length;
    const distribution = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
    let sum = 0;

    matchingPublished.forEach((r) => {
      const rNum = Math.round(Number(r.rating) || 5);
      if (distribution[rNum] !== undefined) {
        distribution[rNum] += 1;
      }
      sum += Number(r.rating) || 5;
    });

    const averageRating = total > 0 ? (sum / total).toFixed(1) : "0.0";

    // 5. Get top 10 recent published reviews
    matchingPublished.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const latestReviews = matchingPublished.slice(0, 10).map((r) => ({
      id: r.id || r._id?.toString(),
      author: r.authorName || "Anonymous",
      rating: Number(r.rating) || 5,
      title: r.title || "",
      body: r.body || "",
      replies: (r.replies || []).map((rep) => rep.body || ""),
      date: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
    }));

    // 6. Push to Shopify via metafieldsSet (app-owned structured definitions)
    const metafields = [
      {
        ownerId: productGid,
        namespace: "$app",
        key: "reviews",
        type: "json",
        value: JSON.stringify(latestReviews),
      },
      {
        ownerId: productGid,
        namespace: "$app",
        key: "rating",
        type: "rating",
        value: JSON.stringify({
          scale_min: "1.0",
          scale_max: "5.0",
          value: String(averageRating),
        }),
      },
      {
        ownerId: productGid,
        namespace: "$app",
        key: "rating_count",
        type: "number_integer",
        value: String(total),
      },
      {
        ownerId: productGid,
        namespace: "$app",
        key: "distribution",
        type: "json",
        value: JSON.stringify(distribution),
      },
    ];

    const response = await admin.graphql(SET_PRODUCT_METAFIELDS_MUTATION, {
      variables: { metafields },
    });
    const result = await response.json();
    const errors = result?.data?.metafieldsSet?.userErrors;

    if (errors && errors.length > 0) {
      console.error("[Reviora Metafields] userErrors while syncing metafields:", errors);
      return { success: false, errors };
    }

    console.log(`[Reviora Metafields] Synced metafields for ${productGid} (reviews: ${total}, avg: ${averageRating})`);
    return { success: true, total, averageRating };
  } catch (err) {
    console.error("[Reviora Metafields] Failed to sync product metafields:", err?.message || err);
    return { success: false, error: err?.message };
  }
}


/**
 * Export all reviews for a shop formatted as standard CSV
 * @param {string} shop
 */
export async function exportReviewsToCsv(shop) {
  await connectDB();
  const storeDoc = await StoreReviews.findOne({ shop }).lean();
  const reviews = storeDoc?.reviews || [];

  const headers = ["title", "body", "rating", "review_date", "reviewer_name", "reviewer_email", "product_handle", "status", "verified"];
  const rows = reviews.map((r) => {
    let dateStr = "";
    if (r.createdAt) {
      try {
        const d = new Date(r.createdAt);
        dateStr = isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
      } catch {
        dateStr = "";
      }
    }
    if (!dateStr) {
      dateStr = new Date().toISOString().split("T")[0];
    }

    return [
      `"${(r.title || "").replace(/"/g, '""')}"`,
      `"${(r.body || "").replace(/"/g, '""')}"`,
      r.rating || 5,
      `"${dateStr}"`,
      `"${(r.authorName || "").replace(/"/g, '""')}"`,
      `"${(r.authorEmail || "").replace(/"/g, '""')}"`,
      `"${(r.productHandle || r.productId || "").replace(/"/g, '""')}"`,
      `"${r.status || "Published"}"`,
      r.verified ? "true" : "false",
    ];
  });

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}


