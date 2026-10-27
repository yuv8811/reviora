import mongoose from "mongoose";

const ReviewRequestSchema = new mongoose.Schema(
  {
    shop: { type: String, required: true, index: true },
    orderId: { type: String, required: true },
    customerEmail: { type: String, required: true },
    customerName: { type: String },
    productId: { type: String, required: true },
    productTitle: { type: String },
    channel: {
      type: String,
      enum: ["EMAIL", "SMS", "WHATSAPP"],
      default: "EMAIL",
    },
    status: {
      type: String,
      enum: ["SCHEDULED", "SENT", "COMPLETED", "CANCELLED", "FAILED"],
      default: "SCHEDULED",
      index: true,
    },
    errorMessage: { type: String },
    scheduledAt: { type: Date, default: Date.now },
    sentAt: { type: Date },
    token: { type: String, required: true, unique: true },
  },
  {
    timestamps: true,
  }
);

ReviewRequestSchema.index({ shop: 1, status: 1 });

ReviewRequestSchema.virtual("id").get(function () {
  return this._id.toHexString();
});
ReviewRequestSchema.set("toJSON", { virtuals: true });
ReviewRequestSchema.set("toObject", { virtuals: true });

if (mongoose.models.ReviewRequest) {
  delete mongoose.models.ReviewRequest;
}

export const ReviewRequest = mongoose.model("ReviewRequest", ReviewRequestSchema);
