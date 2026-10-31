// Reviora Subscription & Billing Page - Clean Native Polaris Layout
import { useState, useEffect } from "react";
import process from "process";
import { useLoaderData, useNavigation, useSubmit, useActionData, redirect } from "react-router";
import { authenticate } from "../shopify.server.js";
import { checkProPlanActive, cancelProSubscription } from "../utils/billing.server.js";
import { Check } from "lucide-react";

const PLAN_FREE = "Free";
const PLAN_PRO = "Pro";

export const loader = async ({ request }) => {
  const { admin, billing, session } = await authenticate.admin(request);
  const shop = session.shop;

  const result = await checkProPlanActive({ admin, billing, shop });

  return {
    shop,
    hasActivePayment: result.hasActivePayment,
    current: result.activeSubscriptionName,
    currentPlan: result.currentPlan,
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
    return redirect("/app/billing");
  }

  // Requesting Pro Plan: Create subscription charge via GraphQL & return confirmationUrl for top-level redirect
  if (plan === PLAN_PRO || plan === "PRO") {
    try {
      const isTestParam = formData.get("isTest") === "true";

      // Detect if store is a partner development store so test billing is used
      let isDevStore = false;
      try {
        const shopRes = await admin.graphql(
          `#graphql
          query getShopPlanForBilling {
            shop {
              plan {
                partnerDevelopment
              }
            }
          }`
        );
        const shopJson = await shopRes.json();
        isDevStore = Boolean(shopJson?.data?.shop?.plan?.partnerDevelopment);
      } catch (shopPlanErr) {
        console.warn("Could not check if shop is development store:", shopPlanErr?.message || shopPlanErr);
      }

      // During app review and on test stores, Shopify strictly requires test: true.
      // Until an app is published on the Shopify App Store, live billing (test: false) fails.
      let testFlag = true;
      if (process.env.NODE_ENV === "production" && !isDevStore && !isTestParam) {
        testFlag = process.env.FORCE_LIVE_BILLING === "true";
      }

      const cleanShop = session.shop.replace(".myshopify.com", "");
      const apiKey = process.env.SHOPIFY_API_KEY || "f79eb2d3832f37be2bb3a5c7c1efd416";
      const returnUrl = `https://admin.shopify.com/store/${cleanShop}/apps/${apiKey}/app/billing`;

      const executeSubscriptionMutation = async (useTest) => {
        const res = await admin.graphql(
          `#graphql
          mutation AppSubscriptionCreate(
            $name: String!
            $returnUrl: URL!
            $test: Boolean
            $lineItems: [AppSubscriptionLineItemInput!]!
          ) {
            appSubscriptionCreate(
              name: $name
              returnUrl: $returnUrl
              test: $test
              lineItems: $lineItems
            ) {
              appSubscription {
                id
              }
              confirmationUrl
              userErrors {
                field
                message
              }
            }
          }`,
          {
            variables: {
              name: "Pro",
              returnUrl,
              test: useTest,
              lineItems: [
                {
                  plan: {
                    appRecurringPricingDetails: {
                      price: { amount: 4.99, currencyCode: "USD" },
                      interval: "EVERY_30_DAYS",
                    },
                  },
                },
              ],
            },
          }
        );
        return await res.json();
      };

      let json = await executeSubscriptionMutation(testFlag);
      let userErrors = json?.data?.appSubscriptionCreate?.userErrors;

      // If failed with live charge (e.g. unpublished app / test account), retry automatically with test: true
      if (userErrors && userErrors.length > 0 && !testFlag) {
        console.warn("Live subscription creation failed, retrying with test: true:", userErrors);
        json = await executeSubscriptionMutation(true);
        userErrors = json?.data?.appSubscriptionCreate?.userErrors;
      }

      if (userErrors && userErrors.length > 0) {
        const userErrMsg = userErrors.map((e) => e.message).join(", ");
        console.error("Shopify billing userErrors:", userErrMsg);
        return { error: userErrMsg };
      }

      const confirmationUrl = json?.data?.appSubscriptionCreate?.confirmationUrl;
      if (confirmationUrl) {
        return { confirmationUrl };
      }

      return { error: "No confirmation URL returned by Shopify." };
    } catch (err) {
      let errorMessage = "Failed to initiate billing request with Shopify.";
      if (err instanceof Response) {
        try {
          const errorJson = await err.json();
          errorMessage = errorJson?.errors?.[0]?.message || (typeof errorJson?.errors === "string" ? errorJson.errors : null) || errorJson?.message || errorMessage;
        } catch {
          try {
            const text = await err.text();
            if (text && text.length < 200) errorMessage = text;
          } catch {
            // ignore
          }
        }
      } else if (err?.message) {
        errorMessage = err.message;
      }
      console.error("Billing request error:", errorMessage, err);
      return { error: errorMessage };
    }
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
