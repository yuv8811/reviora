import { updateShopSettings, getShopSettings } from "../models/review.server.js";

/**
 * Check if the active store has an active Pro subscription on Shopify.
 * Queries Shopify's GraphQL currentAppInstallation.activeSubscriptions (handles both test & live charges),
 * with fallbacks to billing.check (both test: true and test: false) and database state.
 */
export async function checkProPlanActive({ admin, billing, shop }) {
  let hasActivePayment = false;
  let activeSubscriptionName = null;
  let activeSubscription = null;
  let liveCheckSucceeded = false;

  // 1. Direct GraphQL check against Shopify currentAppInstallation.activeSubscriptions
  // Ground truth on Shopify: accurately detects test charges on partner development stores as well as live charges!
  try {
    const res = await admin.graphql(
      `#graphql
      query getActiveAppSubscriptions {
        currentAppInstallation {
          id
          activeSubscriptions {
            id
            name
            status
            test
            currentPeriodEnd
            createdAt
          }
        }
      }`
    );
    const json = await res.json();
    const activeSubs = json?.data?.currentAppInstallation?.activeSubscriptions || [];
    liveCheckSucceeded = true;

    const proSub = activeSubs.find(
      (s) => s.status === "ACTIVE" && (s.name === "Pro" || s.name?.toLowerCase().includes("pro"))
    );

    if (proSub) {
      hasActivePayment = true;
      activeSubscriptionName = proSub.name;
      activeSubscription = proSub;
    }
  } catch (gqlErr) {
    console.warn("GraphQL activeSubscriptions check failed, trying billing.check:", gqlErr?.message || gqlErr);
  }

  // 2. Fallback to Shopify billing.check (checking test: true and test: false)
  if (!liveCheckSucceeded && billing) {
    try {
      const testCheck = await billing.check({
        plans: ["Pro"],
        isTest: true,
      });
      liveCheckSucceeded = true;
      if (testCheck.hasActivePayment) {
        hasActivePayment = true;
        activeSubscriptionName = testCheck.appSubscriptions?.[0]?.name ?? "Pro";
        activeSubscription = testCheck.appSubscriptions?.[0] ?? null;
      } else {
        const liveCheck = await billing.check({
          plans: ["Pro"],
          isTest: false,
        });
        if (liveCheck.hasActivePayment) {
          hasActivePayment = true;
          activeSubscriptionName = liveCheck.appSubscriptions?.[0]?.name ?? "Pro";
          activeSubscription = liveCheck.appSubscriptions?.[0] ?? null;
        }
      }
    } catch (checkErr) {
      console.warn("billing.check fallback failed:", checkErr?.message || checkErr);
    }
  }

  // 3. Fallback to DB ONLY if both Shopify live checks completely failed (network/API error)
  if (!liveCheckSucceeded) {
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
    activeSubscription,
  };
}

/**
 * Creates a recurring Pro subscription on Shopify via GraphQL appSubscriptionCreate.
 * Automatically detects development stores, handles test flags, and retries with test mode if required.
 *
 * @param {object} params
 * @param {object} params.admin - Shopify admin API client
 * @param {object} [params.billing] - Shopify app billing context
 * @param {object} params.session - Active shop session
 * @param {string} [params.returnPath="/app/billing"] - Relative path within the app to return to
 * @param {boolean} [params.isTestParam=false] - Whether explicitly requested as a test charge
 * @returns {Promise<{ confirmationUrl?: string, error?: string }>}
 */
export async function createProSubscription({
  admin,
  session,
  returnPath = "/app/billing",
  isTestParam = false,
}) {
  try {
    // 1. Detect if store is a partner development store (Shopify requires test: true on dev stores)
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

    const isTestEnv = process.env.NODE_ENV !== "production";
    const forceTest =
      process.env.FORCE_TEST_BILLING === "true" || process.env.TEST_BILLING === "true";
    const testFlag = isDevStore || isTestEnv || isTestParam || forceTest;

    const cleanShop = session.shop.replace(".myshopify.com", "");
    const apiKey = process.env.SHOPIFY_API_KEY || "f79eb2d3832f37be2bb3a5c7c1efd416";
    const separator = returnPath.includes("?") ? "&" : "?";
    const testQuery = testFlag ? `${separator}test=true` : "";
    const returnUrl = `https://admin.shopify.com/store/${cleanShop}/apps/${apiKey}${returnPath}${testQuery}`;

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
              status
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
        errorMessage =
          errorJson?.errors?.[0]?.message ||
          (typeof errorJson?.errors === "string" ? errorJson.errors : null) ||
          errorJson?.message ||
          errorMessage;
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

/**
 * Cancels active Pro subscriptions on Shopify (GraphQL appSubscriptionCancel + billing.cancel fallback)
 * and updates database shop settings to FREE.
 */
export async function cancelProSubscription({ admin, billing, shop }) {
  try {
    const res = await admin.graphql(
      `#graphql
      query getActiveAppSubscriptionsForCancel {
        currentAppInstallation {
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
    const activeSubs = json?.data?.currentAppInstallation?.activeSubscriptions || [];
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
          console.warn(
            "GraphQL cancel failed, falling back to billing.cancel:",
            subCancelErr?.message || subCancelErr
          );
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
