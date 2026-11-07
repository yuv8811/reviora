import { useState } from "react";
import { useLoaderData, Link, redirect } from "react-router";
import { authenticate } from "../shopify.server.js";
import { StoreReviews } from "../models/review.model.js";
import { ReviewRequest } from "../models/reviewRequest.model.js";
import { connectDB } from "../db.server.js";
import { MetricCard } from "../components/MetricCard.jsx";
import { StarRating } from "../components/StarRating.jsx";
import { checkProPlanActive } from "../utils/billing.server.js";
import { Star, MessageSquare, Clock, MessageCircleText, MessageCirclePlus } from "lucide-react";
import process from "process";

export const loader = async ({ request }) => {
  const { session, admin, billing } = await authenticate.admin(request);
  const shop = session.shop;
  const url = new URL(request.url);

  // Fast redirect if onboarding explicitly requested in query
  const forceOnboarding =
    url.searchParams.get("onboarding") === "true" ||
    url.searchParams.get("onboarding") === "1";

  if (forceOnboarding) {
    const params = new URLSearchParams(url.searchParams);
    return redirect(`/app/onboarding?${params.toString()}`);
  }

  await connectDB();

  // Run all required database reads and live billing check concurrently in parallel
  const [storeDoc, totalRequests, billingResult] = await Promise.all([
    StoreReviews.findOne({ shop }).lean({ virtuals: true }),
    ReviewRequest.countDocuments({ shop }),
    checkProPlanActive({ admin, billing, shop }),
  ]);

  const isOnboardingCompleted = Boolean(storeDoc?.onboardingCompleted);

  // If onboarding is not yet completed for this store, direct to the setup wizard
  if (!isOnboardingCompleted) {
    const params = new URLSearchParams(url.searchParams);
    return redirect(`/app/onboarding?${params.toString()}`);
  }

  const allReviews = (storeDoc?.reviews || []).map((r) => ({
    ...r,
    id: r.id || r._id?.toString(),
  }));

  // Calculate dashboard KPI metrics directly in-memory from the loaded store document
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

  const metrics = {
    totalReviews,
    publishedReviews: pubCount,
    pendingReviews,
    averageRating: Number(averageRating),
    distribution,
    totalRequests,
  };

  // Extract the 5 most recent reviews
  allReviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const recentReviews = allReviews.slice(0, 5);

  const shopSettings = {
    shop,
    plan: storeDoc?.plan || "FREE",
    widgetSettings: storeDoc?.widgetSettings || {},
    onboardingStep: storeDoc?.onboardingStep || 1,
    onboardingCompleted: true,
    primaryColor: storeDoc?.widgetSettings?.primaryColor || "#FFB800",
    badgeColor: storeDoc?.widgetSettings?.badgeColor || "#10B981",
    autoPublish: true,
    minAutoPublishRating: 4,
    enableAiFeatures: true,
  };

  const hasActivePayment = Boolean(billingResult?.hasActivePayment);

  return {
    metrics,
    recentReviews,
    shopSettings,
    shop,
    apiKey: process.env.SHOPIFY_API_KEY || "f79eb2d3832f37be2bb3a5c7c1efd416",
    hasActivePayment,
    currentPlan: hasActivePayment ? "PRO" : "FREE",
    justCompleted: url.searchParams.get("setupComplete") === "true",
  };
};

export default function DashboardPage() {
  const loaderData = useLoaderData();

  const metrics = loaderData?.metrics || {
    averageRating: 0,
    totalReviews: 0,
    publishedReviews: 0,
    pendingReviews: 0,
    totalRequests: 0,
    distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  };
  const recentReviews = loaderData?.recentReviews || [];

  // Feature request and contact support state
  const [featureTitle, setFeatureTitle] = useState("");
  const [featureDetails, setFeatureDetails] = useState("");
  const [featureSubmitted, setFeatureSubmitted] = useState(false);

  const handleOpenFeatureModal = () => {
    if (window.shopify?.modal) {
      window.shopify.modal.show("dashboard-feature-modal");
    } else {
      document.getElementById("dashboard-feature-modal")?.showOverlay();
    }
  };

  const handleCloseFeatureModal = () => {
    if (window.shopify?.modal) {
      window.shopify.modal.hide("dashboard-feature-modal");
    } else {
      document.getElementById("dashboard-feature-modal")?.hideOverlay();
    }
  };

  const handleSendFeatureRequest = () => {
    if (!featureTitle.trim()) return;
    const mailto = `mailto:support@reviora.com?subject=${encodeURIComponent("Feature Request: " + featureTitle)}&body=${encodeURIComponent(featureDetails || featureTitle)}`;
    window.open(mailto, "_blank");
    handleCloseFeatureModal();
    setFeatureSubmitted(true);
    setFeatureTitle("");
    setFeatureDetails("");
    setTimeout(() => setFeatureSubmitted(false), 5000);
  };

  const handleContactSupport = () => {
    window.open("mailto:support@reviora.com?subject=Support%20Inquiry%20-%20Reviora", "_blank");
  };

  return (
    <s-page heading="Dashboard">
      <s-stack gap="base">
        {loaderData?.justCompleted && (
          <s-banner tone="success" heading="🎉 Setup Complete!">
            <s-paragraph>
              Congratulations! Your theme widgets and initial settings have been activated.
            </s-paragraph>
          </s-banner>
        )}

        {featureSubmitted && (
          <s-banner tone="success" heading="Feature Request Submitted">
            <s-paragraph>
              Thank you for helping make Reviora better! Our product team reviews every merchant suggestion.
            </s-paragraph>
          </s-banner>
        )}

        {/* KPI Cards Grid */}
        <s-grid gridTemplateColumns="repeat(auto-fit, minmax(220px, 1fr))" gap="base">
          <MetricCard
            label="Overall Rating"
            value={`★ ${metrics.averageRating}`}
            subtext="Across all published reviews"
            icon={Star}
            tone="success"
          />

          <MetricCard
            label="Total Reviews"
            value={metrics.totalReviews}
            subtext={`${metrics.publishedReviews} active on storefront`}
            icon={MessageSquare}
            tone="default"
          />

          <MetricCard
            label="Pending Moderation"
            value={metrics.pendingReviews}
            subtext={
              metrics.pendingReviews > 0
                ? `${metrics.pendingReviews} waiting for approval`
                : "All reviews moderated"
            }
            icon={Clock}
            tone={metrics.pendingReviews > 0 ? "warning" : "success"}
          />
        </s-grid>

        {/* Recent Reviews Activity Section */}
        <s-section>
          <s-stack gap="base">
            <s-stack direction="inline" justifyContent="space-between" alignItems="center">
              <s-heading>Recent Reviews Activity</s-heading>
              {recentReviews.length > 0 && (
                <Link to="/app/reviews" style={{ textDecoration: "none" }}>
                  <s-button variant="primary">
                    View all in Moderation Inbox →
                  </s-button>
                </Link>
              )}
            </s-stack>

            {recentReviews.length === 0 ? (
              <s-box padding="large">
                <s-stack gap="extra-tight" alignItems="center">
                  <s-text color="subdued" type="strong">No reviews collected yet</s-text>
                  <s-paragraph color="subdued">
                    Customer reviews will appear here once submitted on your store or imported.
                  </s-paragraph>
                </s-stack>
              </s-box>
            ) : (
              <s-stack gap="small">
                {recentReviews.map((r) => {
                  const isPub = (r.status || "").toUpperCase() === "PUBLISHED";
                  const statusLabel = r.status
                    ? r.status.charAt(0).toUpperCase() + r.status.slice(1).toLowerCase()
                    : "Published";

                  return (
                    <s-box key={r.id} padding="base" background="subdued" border="base" borderRadius="base">
                      <s-stack gap="extra-tight">
                        <s-stack direction="inline" justifyContent="space-between" alignItems="center">
                          <s-stack direction="inline" gap="extra-tight" alignItems="center">
                            <StarRating rating={r.rating} size={14} />
                            <s-text type="strong">{r.title || "Customer Review"}</s-text>
                          </s-stack>
                          <s-badge tone={isPub ? "success" : "warning"}>
                            {statusLabel}
                          </s-badge>
                        </s-stack>

                        <s-paragraph>{r.body}</s-paragraph>

                        <s-text color="subdued">
                          By {r.authorName} on {new Date(r.createdAt).toLocaleDateString()}
                          {Boolean(r.verified && r.authorEmail) && " • Verified Buyer"}
                        </s-text>
                      </s-stack>
                    </s-box>
                  );
                })}
              </s-stack>
            )}
          </s-stack>
        </s-section>

        {/* 2 App Bridge Callout Cards: Request a Feature & Contact Us */}
        <s-grid gridTemplateColumns="repeat(auto-fit, minmax(280px, 1fr))" gap="base">
          {/* Callout Card 1: Request a Feature */}
          <s-section>
            <s-stack gap="small">
              <s-stack direction="inline" gap="small" alignItems="center">
                <MessageCirclePlus size={18} />
                <s-heading size="small">Request a Feature</s-heading>
              </s-stack>
              <s-paragraph color="subdued">
                Have an idea for a new widget, custom review style, or specific integration? Let us know what you need and our team will build it.
              </s-paragraph>
              <div style={{ marginTop: "4px" }}>
                <s-button variant="secondary" onClick={handleOpenFeatureModal}>
                  Request a Feature ↗
                </s-button>
              </div>
            </s-stack>
          </s-section>

          {/* Callout Card 2: Contact Us */}
          <s-section>
            <s-stack gap="small">
              <s-stack direction="inline" gap="small" alignItems="center">
                <MessageCircleText size={18} />
                <s-heading size="small">Contact Us</s-heading>
              </s-stack>
              <s-paragraph color="subdued">
                Need help installing widgets or have questions about your store? Our dedicated support team is available 24/7 to assist you.
              </s-paragraph>
              <div style={{ marginTop: "4px" }}>
                <s-button variant="primary" onClick={handleContactSupport}>
                  Contact Support ↗
                </s-button>
              </div>
            </s-stack>
          </s-section>
        </s-grid>
      </s-stack>

      {/* Feature Request Modal */}
      <s-modal id="dashboard-feature-modal" heading="Request a Feature">
        <s-stack gap="base">
          <s-paragraph>
            Tell us about the feature, widget, or integration you would like to see in Reviora:
          </s-paragraph>
          <s-text-field
            label="Feature Title / Summary"
            placeholder="e.g. TikTok video reviews, custom form questions, loyalty points"
            value={featureTitle}
            onInput={(e) => setFeatureTitle(e.target.value)}
          />
          <s-text-field
            label="Details &amp; Use Case"
            placeholder="Describe how this feature will help your store..."
            value={featureDetails}
            onInput={(e) => setFeatureDetails(e.target.value)}
            multiline="4"
          />
        </s-stack>
        <s-button
          slot="primary-action"
          variant="primary"
          onClick={handleSendFeatureRequest}
        >
          Submit Request
        </s-button>
        <s-button
          slot="secondary-actions"
          commandFor="dashboard-feature-modal"
          command="--hide"
          onClick={handleCloseFeatureModal}
        >
          Cancel
        </s-button>
      </s-modal>
    </s-page>
  );
}
