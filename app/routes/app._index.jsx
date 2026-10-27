import { useState } from "react";
import { useLoaderData, useFetcher, useNavigate, Link, redirect } from "react-router";
import { authenticate } from "../shopify.server.js";
import { getDashboardMetrics, getShopSettings, updateShopSettings } from "../models/review.server.js";
import { StoreReviews } from "../models/review.model.js";
import { connectDB } from "../db.server.js";
import { MetricCard } from "../components/MetricCard.jsx";
import { StarRating } from "../components/StarRating.jsx";
import { OnboardingWizard } from "../components/OnboardingWizard.jsx";
import { getAppBillingDetails } from "../utils/billing.server.js";
import { Star, MessageSquare, Clock, Send } from "lucide-react";

export const loader = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  const shop = session.shop;
  const metrics = await getDashboardMetrics(shop);
  await connectDB();
  const storeDoc = await StoreReviews.findOne({ shop }).lean({ virtuals: true });
  const shopSettings = await getShopSettings(shop);

  // Check live Shopify billing status via Shopify App Pricing
  let hasActivePayment = false;
  try {
    const billingDetails = await getAppBillingDetails(admin, session);
    hasActivePayment = billingDetails.hasActivePayment;
    if (hasActivePayment && shopSettings?.plan !== "PRO") {
      await updateShopSettings(shop, { plan: "PRO" });
    }
  } catch (err) {
    hasActivePayment = shopSettings?.plan === "PRO";
  }

  let defaultThemeId = "current";
  try {
    const response = await admin.graphql(
      `#graphql
      query getStoreThemes {
        themes(first: 5, roles: [MAIN]) {
          nodes {
            id
          }
        }
      }`
    );
    const json = await response.json();
    const node = json?.data?.themes?.nodes?.[0];
    if (node?.id) {
      defaultThemeId = node.id.split("/").pop();
    }
  } catch (err) {
    console.error("Theme lookup error in dashboard:", err?.message || err);
  }

  const allReviews = (storeDoc?.reviews || []).map((r) => ({
    ...r,
    id: r.id || r._id?.toString(),
  }));

  // Sort latest first and take 5
  allReviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const recentReviews = allReviews.slice(0, 5);

  const url = new URL(request.url);
  const forceOnboarding =
    url.searchParams.get("onboarding") === "true" ||
    url.searchParams.get("onboarding") === "1";
  const isTestParam =
    url.searchParams.get("test") === "true" ||
    url.searchParams.get("test") === "1";

  // Redirect to dedicated /app/onboarding if onboarding requested or not completed
  if (forceOnboarding || !shopSettings?.onboardingCompleted) {
    const params = new URLSearchParams();
    if (isTestParam) params.set("test", "true");
    const step = url.searchParams.get("step");
    if (step) params.set("step", step);
    const qs = params.toString();
    return redirect(`/app/onboarding${qs ? `?${qs}` : ""}`);
  }

  const urlStep = parseInt(url.searchParams.get("step") || "0", 10);
  const dbStep = shopSettings?.onboardingStep || 1;
  let initialStep = urlStep > 0 ? urlStep : dbStep;
  if (hasActivePayment && initialStep < 4) {
    initialStep = 4;
  }

  return {
    metrics,
    recentReviews,
    shopSettings,
    shop,
    apiKey: process.env.SHOPIFY_API_KEY || "",
    defaultThemeId,
    forceOnboarding,
    initialStep,
    hasActivePayment,
    currentPlan: hasActivePayment ? "PRO" : (shopSettings?.plan || "FREE"),
  };
};

export const action = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get("actionType");

  if (actionType === "verifyTheme") {
    try {
      const response = await admin.graphql(
        `#graphql
        query getActiveThemeForVerification {
          themes(first: 1, roles: [MAIN]) {
            nodes {
              id
              name
            }
          }
        }`
      );
      const json = await response.json();
      const liveTheme = json?.data?.themes?.nodes?.[0];
      return {
        verified: true,
        themeName: liveTheme?.name || "Live Theme",
      };
    } catch (err) {
      console.error("Theme verification query error:", err?.message || err);
      return { verified: true, themeName: "Live Theme" };
    }
  }

  if (actionType === "subscribePro") {
    try {
      const billingDetails = await getAppBillingDetails(admin, session);
      return { confirmationUrl: billingDetails.pricingUrl };
    } catch (err) {
      console.error("subscribePro error in onboarding:", err?.message || err);
      return { error: err?.message || "Failed to load pricing page" };
    }
  }

  if (actionType === "saveOnboardingStep") {
    const step = parseInt(formData.get("step") || "1", 10);
    const plan = formData.get("plan");
    const primaryColor = formData.get("primaryColor");
    const update = { onboardingStep: step };
    if (plan) update.plan = plan;
    if (primaryColor) update.primaryColor = primaryColor;
    await updateShopSettings(session.shop, update);
    return { success: true, onboardingStep: step };
  }

  if (actionType === "completeOnboarding") {
    const plan = formData.get("plan") || "FREE";
    const primaryColor = formData.get("primaryColor") || "#FFB800";
    await updateShopSettings(session.shop, {
      onboardingCompleted: true,
      onboardingStep: 5,
      plan,
      primaryColor,
    });
    return { success: true, onboardingCompleted: true };
  }

  return null;
};

export default function DashboardPage() {
  const loaderData = useLoaderData();
  const fetcher = useFetcher();
  const navigate = useNavigate();

  const shopSettings = loaderData?.shopSettings;
  const shop = loaderData?.shop;
  const apiKey = loaderData?.apiKey;
  const defaultThemeId = loaderData?.defaultThemeId || "current";

  const [replayOnboarding, setReplayOnboarding] = useState(false);
  const [completedLocally, setCompletedLocally] = useState(false);

  // Check if onboarding is completed in database, active state, or after completing
  const isOnboardingCompleted =
    completedLocally ||
    Boolean(fetcher.data?.onboardingCompleted) ||
    (!replayOnboarding &&
      !loaderData?.forceOnboarding &&
      Boolean(shopSettings?.onboardingCompleted));

  const metrics = loaderData?.metrics || {
    averageRating: 0,
    totalReviews: 0,
    publishedReviews: 0,
    pendingReviews: 0,
    totalRequests: 0,
    distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  };
  const recentReviews = loaderData?.recentReviews || [];

  const handleCompleteOnboarding = ({ primaryColor, plan }) => {
    setCompletedLocally(true);
    setReplayOnboarding(false);

    if (typeof window !== "undefined") {
      try {
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete("onboarding");
        cleanUrl.searchParams.delete("step");
        window.history.replaceState({}, "", cleanUrl.pathname);
      } catch (e) {
        // ignore
      }
    }

    fetcher.submit(
      {
        actionType: "completeOnboarding",
        primaryColor,
        plan,
      },
      { method: "POST" }
    );

    navigate("/app", { replace: true });
  };

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
    if (window.$zoho?.salesiq?.floatwindow) {
      window.$zoho.salesiq.floatwindow.visible("show");
    } else {
      window.open("mailto:support@reviora.com?subject=Support%20Inquiry%20-%20Reviora", "_blank");
    }
  };

  // If app was installed first time and onboarding is incomplete, enforce unskippable wizard
  if (!isOnboardingCompleted) {
    return (
      <s-page heading="Setup Guide">
        <OnboardingWizard
          shop={shop}
          apiKey={apiKey}
          defaultThemeId={defaultThemeId}
          onComplete={handleCompleteOnboarding}
          initialStep={loaderData?.initialStep || 1}
          hasActivePayment={Boolean(loaderData?.hasActivePayment)}
          currentPlan={loaderData?.currentPlan || "FREE"}
        />
      </s-page>
    );
  }

  return (
    <s-page heading="Dashboard">
      <s-stack gap="base">
        {fetcher.data?.onboardingCompleted && (
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

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <s-button variant="secondary" onClick={() => navigate("/app/onboarding")}>
            Replay Setup Guide ↗
          </s-button>
        </div>

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

          <MetricCard
            label="Review Requests Sent"
            value={metrics.totalRequests}
            subtext="Automated fulfillment notifications"
            icon={Send}
            tone="default"
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
                <span style={{ fontSize: "22px", lineHeight: 1 }}>💡</span>
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
                <span style={{ fontSize: "22px", lineHeight: 1 }}>💬</span>
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


