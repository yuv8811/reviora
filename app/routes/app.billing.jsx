// Reviora Subscription & Billing Page - Clean Native Polaris Layout
import { useState, useEffect } from "react";
import { useLoaderData, useNavigation, useSubmit, useActionData, redirect } from "react-router";
import { authenticate } from "../shopify.server.js";
import { getAppPricingDetails } from "../utils/billing.server.js";
import { Check } from "lucide-react";

const PLAN_FREE = "Free";
const PLAN_PRO = "Pro";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const details = await getAppPricingDetails(admin, session);

  return {
    shop: details.shop,
    hasActivePayment: details.hasActivePayment,
    current: details.currentSubscription?.name ?? null,
    currentPlan: details.currentPlan,
    pricingPlansUrl: details.pricingPlansUrl,
  };
};

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const details = await getAppPricingDetails(admin, session);
  const form = await request.formData();
  const plan = form.get("plan");
  const intent = form.get("intent");

  // In Shopify App Pricing (Managed Pricing), plan selection, cancellation, and upgrades
  // are all handled on Shopify's native pricing plans page
  if (intent === "cancel" || plan === "FREE" || plan === PLAN_FREE) {
    return { confirmationUrl: details.pricingPlansUrl };
  }

  if (plan === PLAN_PRO || plan === "PRO") {
    return { confirmationUrl: details.pricingPlansUrl };
  }

  return redirect("/app/billing");
};

export default function BillingPage() {
  const { currentPlan, hasActivePayment } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const submit = useSubmit();

  const isSubmitting = navigation.state === "submitting" || Boolean(actionData?.confirmationUrl);
  const activePlanKey = hasActivePayment ? "PRO" : currentPlan;

  const [selectedPlanForModal, setSelectedPlanForModal] = useState(null);

  // Directly navigate the top parent window out of the iframe to Shopify's confirmation page
  useEffect(() => {
    if (actionData?.confirmationUrl) {
      if (window.shopify?.open) {
        window.shopify.open(actionData.confirmationUrl, "_top");
      } else {
        window.open(actionData.confirmationUrl, "_top");
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
