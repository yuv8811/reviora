import mongoose from "mongoose";

const ProductQASchema = new mongoose.Schema(
  {
    shop: { type: String, required: true, index: true },
    productId: { type: String, required: true, index: true },
    productHandle: { type: String },
    productTitle: { type: String },
    question: { type: String, required: true },
    askerName: { type: String, required: true },
    askerEmail: { type: String, required: true },
    answer: { type: String, default: "" },
    answeredBy: { type: String, default: "Store Team" },
    answeredAt: { type: Date },
    status: {
      type: String,
      enum: ["UNANSWERED", "PUBLISHED", "REJECTED"],
      default: "UNANSWERED",
      index: true,
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

ProductQASchema.virtual("id").get(function () {
  return this._id ? this._id.toHexString() : undefined;
});
ProductQASchema.set("toJSON", { virtuals: true });
ProductQASchema.set("toObject", { virtuals: true });

export const ProductQA =
  mongoose.models.ProductQA || mongoose.model("ProductQA", ProductQASchema);
