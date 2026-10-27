import { useEffect } from "react";
import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server.js";
import { updateShopSettings } from "../models/review.server.js";
import { getAppBillingDetails } from "../utils/billing.server.js";

const PLAN_FREE = "Free";
const PLAN_PRO = "Pro";

export const loader = async ({ request }) => {
  const { admin, redirect, session } = await authenticate.admin(request);
  const shop = session.shop;

  const billingDetails = await getAppBillingDetails(admin, session);
  const hasActivePayment = billingDetails.hasActivePayment;
  const currentPlan = hasActivePayment ? "PRO" : "FREE";

  try {
    await updateShopSettings(shop, { plan: currentPlan });
  } catch (err) {
    console.error("Failed to sync shop settings plan:", err?.message || err);
  }

  const url = new URL(request.url);
  // Direct redirect out of the iframe to native Shopify Pricing Plans page
  if (url.searchParams.get("stay") !== "true") {
    return redirect(billingDetails.pricingUrl, { target: "_top" });
  }

  return {
    shop,
    hasActivePayment,
    current: billingDetails.activePlanName || (hasActivePayment ? PLAN_PRO : PLAN_FREE),
    currentPlan,
    pricingUrl: billingDetails.pricingUrl,
  };
};

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const { pricingUrl } = await getAppBillingDetails(admin, session);
  return { confirmationUrl: pricingUrl };
};

export default function BillingPage() {
  const data = useLoaderData();
  const pricingUrl = data?.pricingUrl;
  const hasActivePayment = data?.hasActivePayment;

  // Auto-redirect to native Shopify plans page if loader redirect didn't break out
  useEffect(() => {
    if (pricingUrl) {
      if (window.shopify?.open) {
        window.shopify.open(pricingUrl, "_top");
      } else {
        window.open(pricingUrl, "_top");
      }
    }
  }, [pricingUrl]);

  const handleOpenPricing = () => {
    if (pricingUrl) {
      if (window.shopify?.open) {
        window.shopify.open(pricingUrl, "_top");
      } else {
        window.open(pricingUrl, "_top");
      }
    }
  };

  return (
    <s-page heading="Subscription & Billing" inlineSize="small">
      <s-section>
        <s-stack gap="base" alignItems="center">
          <s-heading>Redirecting to Shopify Plan Selection...</s-heading>
          <s-paragraph color="subdued">
            You are currently on the <strong>{hasActivePayment ? "Pro Plan ($4.99/mo)" : "Free Plan ($0/mo)"}</strong>.
            All plan upgrades, downgrades, and billing changes are managed directly through Shopify.
          </s-paragraph>
          <s-button variant="primary" onClick={handleOpenPricing}>
            Open Shopify Plans &amp; Billing ↗
          </s-button>
        </s-stack>
      </s-section>
    </s-page>
  );
}
