/**
 * Shopify App Pricing (Managed Pricing) Helper
 * Queries the merchant's current app installation to check active subscriptions
 * and generates the hosted Shopify pricing_plans URL.
 */
export async function getAppBillingDetails(admin, session) {
  let hasActivePayment = false;
  let activePlanName = null;
  let appHandle = "reviora";

  try {
    const response = await admin.graphql(
      `#graphql
      query GetAppBillingDetails {
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
    const currentInstallation = json?.data?.currentAppInstallation;

    if (currentInstallation?.app?.handle) {
      appHandle = currentInstallation.app.handle;
    }

    const activeSubs = currentInstallation?.activeSubscriptions || [];
    const activeSub = activeSubs.find(
      (sub) => sub.status === "ACTIVE" || sub.status === "ACCEPTED"
    );

    if (activeSub) {
      hasActivePayment = true;
      activePlanName = activeSub.name;
    }
  } catch (err) {
    console.error("Failed to query app billing details:", err?.message || err);
  }

  const cleanShop = session?.shop?.replace(".myshopify.com", "") || "";
  const pricingUrl = `https://admin.shopify.com/store/${cleanShop}/charges/${appHandle}/pricing_plans`;

  return {
    hasActivePayment,
    activePlanName,
    appHandle,
    pricingUrl,
  };
}
