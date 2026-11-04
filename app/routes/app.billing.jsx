// Reviora Subscription & Billing Page - Clean Native Polaris Layout
import { useState, useEffect } from "react";
import { useLoaderData, useNavigation, useSubmit, useActionData, redirect } from "react-router";
import { authenticate } from "../shopify.server.js";
import {
  checkProPlanActive,
  createProSubscription,
  cancelProSubscription,
} from "../utils/billing.server.js";
import { Check } from "lucide-react";

const PLAN_FREE = "Free";
const PLAN_PRO = "Pro";

export const loader = async ({ request }) => {
  const { admin, billing, session } = await authenticate.admin(request);
  const shop = session.shop;

  const result = await checkProPlanActive({ admin, billing, shop });
  const url = new URL(request.url);
  const hasChargeId = Boolean(url.searchParams.get("charge_id"));
  const upgraded =
    result.hasActivePayment &&
    (url.searchParams.get("upgraded") === "true" || hasChargeId);
  const declined = !result.hasActivePayment && hasChargeId;
  const downgraded = url.searchParams.get("downgraded") === "true";

  return {
    shop,
    hasActivePayment: result.hasActivePayment,
    current: result.activeSubscriptionName,
    currentPlan: result.currentPlan,
    upgraded,
    declined,
    downgraded,
  };
};

export const action = async ({ request }) => {
  const { admin, billing, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const plan = formData.get("plan");
  const intent = formData.get("intent");

  // Handle cancellation / downgrade to Free
  if (intent === "cancel" || plan === "FREE" || plan === PLAN_FREE) {
    await cancelProSubscription({ admin, billing, shop: session.shop });
    return redirect("/app/billing?downgraded=true");
  }

  // Requesting Pro Plan: Create subscription charge via GraphQL & return confirmationUrl for top-level redirect
  if (plan === PLAN_PRO || plan === "PRO") {
    const isTestParam = formData.get("isTest") === "true";
    const result = await createProSubscription({
      admin,
      billing,
      session,
      returnPath: "/app/billing?upgraded=true",
      isTestParam,
    });

    if (result.confirmationUrl) {
      return { confirmationUrl: result.confirmationUrl };
    }
    return { error: result.error || "Failed to initiate billing request with Shopify." };
  }

  return redirect("/app/billing");
};

export default function BillingPage() {
  const { hasActivePayment, upgraded, declined, downgraded } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const submit = useSubmit();

  const isSubmitting = navigation.state === "submitting" || Boolean(actionData?.confirmationUrl);
  const activePlanKey = hasActivePayment ? "PRO" : "FREE";

  const [selectedPlanForModal, setSelectedPlanForModal] = useState(null);

  // Directly navigate the top parent window out of the iframe to Shopify's confirmation page
  useEffect(() => {
    if (actionData?.confirmationUrl) {
      const url = actionData.confirmationUrl;
      if (window.shopify?.open) {
        window.shopify.open(url, "_top");
      } else {
        try {
          window.top.location.href = url;
        } catch {
          window.location.href = url;
        }
      }
    }
  }, [actionData?.confirmationUrl]);

  const handlePlanSelect = (planKey) => {
    if (planKey === activePlanKey) return;
    setSelectedPlanForModal(planKey);
    if (window.shopify?.modal) {
      window.shopify.modal.show("billing-confirm-modal");
    } else {
      document.getElementById("billing-confirm-modal")?.showOverlay();
    }
  };

  const closeModal = () => {
    if (window.shopify?.modal) {
      window.shopify.modal.hide("billing-confirm-modal");
    } else {
      document.getElementById("billing-confirm-modal")?.hideOverlay();
    }
    setSelectedPlanForModal(null);
  };

  const handleConfirmPlanChange = () => {
    if (!selectedPlanForModal) return;
    const formData = new FormData();
    if (selectedPlanForModal === "FREE") {
      formData.append("intent", "cancel");
      formData.append("plan", "FREE");
    } else {
      formData.append("plan", "PRO");
    }
    submit(formData, { method: "post" });
    closeModal();
  };

  const freeFeatures = [
    "8 Core widgets (Reviews, Star Badge, Q&A, Carousels)",
    "Storefront review collection & Write a Review form",
    "Full moderation inbox (Approve, Reject, Spam filters)",
    "Standard email & documentation support",
  ];

  const proFeatures = [
    "Automated & manual review request emails by order",
    "4 Exclusive widgets: Video Reels, UGC Wall, Popups & Floating Tab",
    "Customer photo & video review uploads with CDN hosting",
    "Google Shopping & Rich Snippets (Schema.org JSON-LD)",
    "Priority 24/7 Live Chat & Email Support",
  ];

  return (
    <s-page heading="Subscription & Plans" inlineSize="small">
      <s-stack gap="base">

        {upgraded && (
          <s-banner tone="success" heading="Subscription Active">
            <s-paragraph>
              You are now successfully subscribed to the Reviora Pro plan ($4.99/mo). All premium features are unlocked!
            </s-paragraph>
          </s-banner>
        )}

        {declined && (
          <s-banner tone="warning" heading="Subscription Not Approved">
            <s-paragraph>
              The subscription charge was not approved. Your account is on the Free plan, and no charges were made. You can upgrade anytime below.
            </s-paragraph>
          </s-banner>
        )}

        {downgraded && (
          <s-banner tone="info" heading="Subscription Updated">
            <s-paragraph>
              Your Pro subscription has been cancelled. Your store is now active on the Free plan.
            </s-paragraph>
          </s-banner>
        )}

        {actionData?.error && (
          <s-banner tone="critical" heading="Billing Error">
            <s-paragraph>{actionData.error}</s-paragraph>
          </s-banner>
        )}

        {/* 2-Column Plan Grid */}
        <s-grid gridTemplateColumns="1fr 1fr" gap="base">
          {/* Free Plan Card */}
          <s-section>
            <s-stack gap="base">
              <s-stack direction="inline" justifyContent="space-between" alignItems="center">
                <s-heading>Free</s-heading>
                {activePlanKey === "FREE" && <s-badge tone="info">Active</s-badge>}
              </s-stack>

              <s-paragraph color="subdued">
                Essential review collection and 8 standard widgets for stores getting started.
              </s-paragraph>

              <s-stack direction="inline" gap="extra-tight" alignItems="baseline">
                <h1 style={{ fontSize: "24px", fontWeight: "bold" }}>$0</h1>
                <s-text color="subdued">/ forever</s-text>
              </s-stack>

              <s-button
                variant="secondary"
                disabled={activePlanKey === "FREE" || isSubmitting}
                loading={isSubmitting && selectedPlanForModal === "FREE"}
                onClick={() => handlePlanSelect("FREE")}
              >
                {activePlanKey === "FREE" ? "Current Plan" : "Downgrade to Free"}
              </s-button>

              <s-divider></s-divider>

              <s-stack gap="small">
                <s-text type="strong">What&apos;s included:</s-text>

                <s-stack gap="small">
                  {freeFeatures.map((feat, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "8px",
                      }}
                    >
                      <span style={{ flexShrink: 0, marginTop: "2px", display: "inline-flex" }}>
                        <Check size={16} color="#10b981" strokeWidth={2.5} />
                      </span>
                      <s-text>{feat}</s-text>
                    </div>
                  ))}
                </s-stack>
              </s-stack>
            </s-stack>
          </s-section>

          {/* Pro Plan Card */}
          <div className={activePlanKey !== "PRO" ? "reviora-plan-card-featured" : ""}>
            <s-section>
              <s-stack gap="base">
                <s-stack direction="inline" justifyContent="space-between" alignItems="center">
                  <s-heading>Pro</s-heading>
                  {activePlanKey === "PRO" ? (
                    <s-badge tone="success">Active</s-badge>
                  ) : (
                    <s-badge tone="info">Recommended</s-badge>
                  )}
                </s-stack>

                <s-paragraph color="subdued">
                  Automated review requests, 4 premium widgets, photo &amp; video reviews.
                </s-paragraph>

                <s-stack direction="inline" gap="extra-tight" alignItems="baseline">
                  <h1 style={{ fontSize: "24px", fontWeight: "bold" }}>$4.99</h1>
                  <s-text color="subdued">/ month</s-text>
                </s-stack>

                <s-button
                  variant={activePlanKey === "PRO" ? "secondary" : "primary"}
                  disabled={activePlanKey === "PRO" || isSubmitting}
                  loading={isSubmitting && selectedPlanForModal === "PRO"}
                  onClick={() => handlePlanSelect("PRO")}
                >
                  {activePlanKey === "PRO" ? "Current Plan" : "Upgrade to Pro"}
                </s-button>

                <s-divider></s-divider>

                <s-stack gap="small">
                  <s-text type="strong">Everything in Free, plus:</s-text>

                  <s-stack gap="small">
                    {proFeatures.map((feat, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "8px",
                        }}
                      >
                        <span style={{ flexShrink: 0, marginTop: "2px", display: "inline-flex" }}>
                          <Check size={16} color="#10b981" strokeWidth={2.5} />
                        </span>
                        <s-text>{feat}</s-text>
                      </div>
                    ))}
                  </s-stack>
                </s-stack>
              </s-stack>
            </s-section>
          </div>
        </s-grid>

      </s-stack>

      {/* Confirmation Modal */}
      <s-modal
        id="billing-confirm-modal"
        heading={selectedPlanForModal === "PRO" ? "Upgrade to Pro Plan?" : "Downgrade to Free Plan?"}
      >
        <s-stack gap="base">
          <s-banner tone="info">
            <s-paragraph>
              {selectedPlanForModal === "PRO"
                ? "You will be redirected to Shopify to approve the $4.99/month recurring subscription for Reviora Pro."
                : "Downgrading to Free will cancel your paid recurring charge. Any reviews previously collected remain safe on your store."}
            </s-paragraph>
          </s-banner>
          <s-paragraph color="subdued">
            Subscription changes take effect immediately on your Shopify billing account.
          </s-paragraph>
        </s-stack>
        <s-button
          slot="primary-action"
          variant="primary"
          loading={isSubmitting}
          onClick={handleConfirmPlanChange}
        >
          {selectedPlanForModal === "PRO" ? "Confirm & Continue to Shopify" : "Confirm Downgrade"}
        </s-button>
        <s-button
          slot="secondary-actions"
          disabled={isSubmitting}
          commandFor="billing-confirm-modal"
          command="--hide"
          onClick={closeModal}
        >
          Cancel
        </s-button>
      </s-modal>

    </s-page>
  );
}
