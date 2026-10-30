import { updateShopSettings, getShopSettings } from "../models/review.server.js";

/**
 * Check if the active store has an active Pro subscription on Shopify.
 * Queries Shopify's GraphQL appInstallation.activeSubscriptions (handles both test & live charges),
 * with fallbacks to billing.check (both test: true and test: false) and database state.
 */
export async function checkProPlanActive({ admin, billing, shop }) {
  let hasActivePayment = false;
  let activeSubscriptionName = null;

  // 1. Direct GraphQL check against Shopify appInstallation.activeSubscriptions
  // Ground truth on Shopify: accurately detects test charges on partner development stores as well as live charges!
  try {
    const res = await admin.graphql(
      `#graphql
      query getActiveAppSubscriptions {
        appInstallation {
          activeSubscriptions {
            id
            name
            status
            test
          }
        }
      }`
    );
    const json = await res.json();
    const activeSubs = json?.data?.appInstallation?.activeSubscriptions || [];
    const proSub = activeSubs.find(
      (s) => s.status === "ACTIVE" && (s.name === "Pro" || s.name?.toLowerCase().includes("pro"))
    );

    if (proSub) {
      hasActivePayment = true;
      activeSubscriptionName = proSub.name;
    }
  } catch (gqlErr) {
    console.warn("GraphQL activeSubscriptions check failed, trying billing.check:", gqlErr?.message || gqlErr);
  }

  // 2. Fallback to Shopify billing.check (checking test: true and test: false)
  if (!hasActivePayment && billing) {
    try {
      const testCheck = await billing.check({
        plans: ["Pro"],
        isTest: true,
      });
      if (testCheck.hasActivePayment) {
        hasActivePayment = true;
        activeSubscriptionName = testCheck.appSubscriptions?.[0]?.name ?? "Pro";
      } else {
        const liveCheck = await billing.check({
          plans: ["Pro"],
          isTest: false,
        });
        if (liveCheck.hasActivePayment) {
          hasActivePayment = true;
          activeSubscriptionName = liveCheck.appSubscriptions?.[0]?.name ?? "Pro";
        }
      }
    } catch (checkErr) {
      console.warn("billing.check fallback failed:", checkErr?.message || checkErr);
    }
  }

  // 3. Fallback to DB if live checks errored
  if (!hasActivePayment) {
    try {
      const settings = await getShopSettings(shop);
      if (settings?.plan === "PRO") {
        hasActivePayment = true;
        activeSubscriptionName = "Pro";
      }
    } catch {
      // ignore
    }
  }

  // 4. Sync the verified status into database
  try {
    const planInDb = hasActivePayment ? "PRO" : "FREE";
    await updateShopSettings(shop, { plan: planInDb });
  } catch (syncErr) {
    console.error("Failed to sync plan in DB:", syncErr?.message || syncErr);
  }

  return {
    hasActivePayment,
    currentPlan: hasActivePayment ? "PRO" : "FREE",
    activeSubscriptionName,
  };
}

/**
 * Cancels active Pro subscriptions on Shopify (GraphQL appSubscriptionCancel + billing.cancel fallback)
 * and updates database shop settings to FREE.
 */
export async function cancelProSubscription({ admin, billing, shop }) {
  try {
    const res = await admin.graphql(
      `#graphql
      query getActiveAppSubscriptionsForCancel {
        appInstallation {
          activeSubscriptions {
            id
            name
            status
            test
          }
        }
      }`
    );
    const json = await res.json();
    const activeSubs = json?.data?.appInstallation?.activeSubscriptions || [];
    for (const sub of activeSubs) {
      if (sub.status === "ACTIVE") {
        try {
          await admin.graphql(
            `#graphql
            mutation CancelAppSubscription($id: ID!) {
              appSubscriptionCancel(id: $id, prorate: true) {
                appSubscription {
                  id
                  status
                }
                userErrors {
                  field
                  message
                }
              }
            }`,
            { variables: { id: sub.id } }
          );
        } catch (subCancelErr) {
          console.warn("GraphQL cancel failed, falling back to billing.cancel:", subCancelErr?.message || subCancelErr);
          if (billing) {
            await billing.cancel({
              subscriptionId: sub.id,
              isTest: Boolean(sub.test),
              prorate: true,
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn("Error cancelling subscriptions:", err?.message || err);
  }

  try {
    await updateShopSettings(shop, { plan: "FREE" });
  } catch (dbErr) {
    console.error("DB plan update to FREE failed:", dbErr?.message || dbErr);
  }

  return { success: true, plan: "FREE", hasActivePayment: false };
}

