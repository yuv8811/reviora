import { getShopSettings, updateShopSettings } from "../models/review.server.js";

/**
 * Helper to fetch app handle, active subscriptions, and the Shopify-managed pricing URL
 * for Shopify App Pricing (Managed Pricing).
 */
export async function getAppPricingDetails(admin, session) {
  const shop = session.shop;
  const cleanShop = shop.replace(".myshopify.com", "");

  let appHandle = "reviora-1";
  let hasActivePayment = false;
  let currentSubscription = null;

  try {
    const response = await admin.graphql(
      `#graphql
      query getAppBillingDetails {
        currentAppInstallation {
          app {
            handle
            apiKey
          }
          activeSubscriptions {
            id
            name
            status
            test
          }
        }
      }`
    );

    const json = await response.json();
    const appData = json?.data?.currentAppInstallation?.app;
    if (appData?.handle) {
      appHandle = appData.handle;
    }

    const subscriptions = json?.data?.currentAppInstallation?.activeSubscriptions || [];
    const activeSub =
      subscriptions.find(
        (s) => s.status === "ACTIVE" && s.name?.toLowerCase().includes("pro")
      ) || subscriptions.find((s) => s.status === "ACTIVE");

    if (activeSub) {
      hasActivePayment = true;
      currentSubscription = activeSub;
    }

    // Sync database plan with live Shopify state
    const planInDb = hasActivePayment ? "PRO" : "FREE";
    await updateShopSettings(shop, { plan: planInDb });
  } catch (err) {
    console.error("Error checking app subscription:", err?.message || err);
    try {
      const settings = await getShopSettings(shop);
      hasActivePayment = settings?.plan === "PRO";
      currentSubscription = hasActivePayment ? { name: "Pro" } : null;
    } catch (e) {
      // ignore
    }
  }

  const pricingPlansUrl = `https://admin.shopify.com/store/${cleanShop}/charges/${appHandle}/pricing_plans`;

  return {
    shop,
    appHandle,
    pricingPlansUrl,
    hasActivePayment,
    currentSubscription,
    currentPlan: hasActivePayment ? "PRO" : "FREE",
  };
}
