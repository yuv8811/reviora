import mongoose from "mongoose";

const ReviewReplySchema = new mongoose.Schema(
  {
    body: { type: String, required: true },
    author: { type: String, default: "Store Owner" },
    isAiGenerated: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

ReviewReplySchema.virtual("id").get(function () {
  return this._id.toHexString();
});
ReviewReplySchema.set("toJSON", { virtuals: true });
ReviewReplySchema.set("toObject", { virtuals: true });

const ReviewMediaSchema = new mongoose.Schema(
  {
    mediaType: { type: String, default: "PHOTO" }, // PHOTO or VIDEO
    url: { type: String, required: true },
    thumbnailUrl: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

ReviewMediaSchema.virtual("id").get(function () {
  return this._id.toHexString();
});
ReviewMediaSchema.set("toJSON", { virtuals: true });
ReviewMediaSchema.set("toObject", { virtuals: true });

export const SingleReviewSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true, index: true },
    productTitle: { type: String },
    productHandle: { type: String },
    orderId: { type: String },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String },
    body: { type: String, required: true },
    authorName: { type: String, required: true },
    authorEmail: { type: String, required: true },
    verified: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["PENDING", "Published", "REJECTED", "FLAGGED"],
      default: "Published",
      index: true,
    },
    sentiment: { type: String, default: "NEUTRAL" }, // POSITIVE, NEUTRAL, NEGATIVE
    topics: { type: String }, // JSON string array of topics
    riskScore: { type: Number, default: 0.0 },
    helpfulCount: { type: Number, default: 0 },
    media: [ReviewMediaSchema],
    replies: [ReviewReplySchema],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    _id: true,
  }
);

SingleReviewSchema.virtual("id").get(function () {
  return this._id ? this._id.toHexString() : undefined;
});
SingleReviewSchema.set("toJSON", { virtuals: true });
SingleReviewSchema.set("toObject", { virtuals: true });

/**
 * Store-level document schema:
 * Exactly ONE document per shop containing all reviews as an embedded array
 */
const StoreReviewsSchema = new mongoose.Schema(
  {
    shop: { type: String, required: true, unique: true, index: true },
    reviews: [SingleReviewSchema],
  },
  {
    timestamps: true,
  }
);

// Indexes on nested fields for fast queries per shop
StoreReviewsSchema.index({ shop: 1, "reviews.productId": 1 });
StoreReviewsSchema.index({ shop: 1, "reviews.status": 1 });
StoreReviewsSchema.index({ shop: 1, "reviews._id": 1 });

StoreReviewsSchema.virtual("id").get(function () {
  return this._id.toHexString();
});
StoreReviewsSchema.set("toJSON", { virtuals: true });
StoreReviewsSchema.set("toObject", { virtuals: true });

export const StoreReviews =
  mongoose.models.StoreReviews || mongoose.model("StoreReviews", StoreReviewsSchema);

// Backward-compatible alias
export const Review = StoreReviews;
