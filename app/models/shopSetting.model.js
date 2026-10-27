import mongoose from "mongoose";

const ShopSettingSchema = new mongoose.Schema(
  {
    shop: { type: String, required: true, unique: true, index: true },
    autoPublish: { type: Boolean, default: true },
    minAutoPublishRating: { type: Number, default: 4 },
    primaryColor: { type: String, default: "#FFB800" },
    badgeColor: { type: String, default: "#10B981" },
    requestTimingDays: { type: Number, default: 7 },
    emailSubject: { type: String, default: "How did you like your purchase?" },
    emailBody: {
      type: String,
      default: "Thank you for your order! We would love to hear your feedback on your recent purchase.",
    },
    enableAiFeatures: { type: Boolean, default: true },
    plan: { type: String, enum: ["FREE", "PRO"], default: "FREE" },
    widgetSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
    onboardingStep: { type: Number, default: 1 },
    onboardingCompleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// Map _id to id virtual for compatibility
ShopSettingSchema.virtual("id").get(function () {
  return this._id.toHexString();
});
ShopSettingSchema.set("toJSON", { virtuals: true });
ShopSettingSchema.set("toObject", { virtuals: true });

export const ShopSetting =
  mongoose.models.ShopSetting || mongoose.model("ShopSetting", ShopSettingSchema);
