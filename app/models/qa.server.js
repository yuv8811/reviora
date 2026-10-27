import { connectDB } from "../db.server.js";
import { ProductQA } from "./qa.model.js";

/**
 * Get all questions for a shop with optional status and search filtering
 */
export async function getStoreQA(shop, { status = "ALL", searchQuery = "" } = {}) {
  await connectDB();
  const filter = { shop };

  if (status && status !== "ALL") {
    filter.status = status;
  }

  if (searchQuery && searchQuery.trim()) {
    const regex = new RegExp(searchQuery.trim(), "i");
    filter.$or = [
      { question: regex },
      { askerName: regex },
      { askerEmail: regex },
      { productTitle: regex },
      { answer: regex },
    ];
  }

  const items = await ProductQA.find(filter)
    .sort({ createdAt: -1 })
    .lean({ virtuals: true });

  return items.map((doc) => ({
    ...doc,
    id: doc._id?.toString() || doc.id,
  }));
}

/**
 * Customer creates a new question
 */
export async function createQuestion({
  shop,
  productId,
  productHandle = "",
  productTitle = "",
  question,
  askerName,
  askerEmail,
}) {
  await connectDB();
  const doc = await ProductQA.create({
    shop,
    productId: String(productId),
    productHandle,
    productTitle,
    question,
    askerName,
    askerEmail,
    status: "UNANSWERED",
  });

  return doc.toObject({ virtuals: true });
}

/**
 * Merchant answers a question and marks it PUBLISHED
 */
export async function answerQuestion({
  shop,
  questionId,
  answer,
  answeredBy = "Store Team",
}) {
  await connectDB();
  const updated = await ProductQA.findOneAndUpdate(
    { _id: questionId, shop },
    {
      $set: {
        answer,
        answeredBy,
        answeredAt: new Date(),
        status: "PUBLISHED",
        updatedAt: new Date(),
      },
    },
    { new: true }
  );

  return updated ? updated.toObject({ virtuals: true }) : null;
}

/**
 * Delete a question
 */
export async function deleteQuestion({ shop, questionId }) {
  await connectDB();
  await ProductQA.deleteOne({ _id: questionId, shop });
  return { success: true };
}

/**
 * Storefront query for published questions for a specific product
 */
export async function getPublicStorefrontQA(shop, productId) {
  await connectDB();
  const targetId = (productId && productId !== "all" && productId !== "general")
    ? String(productId).trim()
    : null;

  const filter = { shop, status: "PUBLISHED" };
  if (targetId) {
    filter.$or = [{ productId: targetId }, { productHandle: targetId }];
  }

  const items = await ProductQA.find(filter)
    .sort({ createdAt: -1 })
    .lean({ virtuals: true });

  return items.map((doc) => ({
    ...doc,
    id: doc._id?.toString() || doc.id,
  }));
}
