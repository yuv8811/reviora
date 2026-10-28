import { useLoaderData, useFetcher, useNavigate } from "react-router";
import { authenticate } from "../shopify.server.js";
import { getShopSettings, updateShopSettings } from "../models/review.server.js";
import { connectDB } from "../db.server.js";
import { OnboardingWizard } from "../components/OnboardingWizard.jsx";
import process from "process";

async function verifyAppEmbedInTheme(admin, session) {
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
    if (!liveTheme) {
      return { verified: false, themeName: "Live Theme", error: "No active live theme found" };
    }

    const themeName = liveTheme.name || "Live Theme";
    const themeNumericId = liveTheme.id.split("/").pop();

    let settingsContent = null;

    // 1. Try GraphQL theme files query for config/settings_data.json
    try {
      const filesRes = await admin.graphql(
        `#graphql
        query getThemeSettingsData($themeId: ID!) {
          theme(id: $themeId) {
            files(filenames: ["config/settings_data.json"], first: 1) {
              nodes {
                filename
                body {
                  ... on ThemeFileBodyText {
                    content
                  }
                }
              }
            }
          }
        }`,
        { variables: { themeId: liveTheme.id } }
      );
      const filesJson = await filesRes.json();
      const node = filesJson?.data?.theme?.files?.nodes?.[0];
      if (node?.body?.content) {
        settingsContent = node.body.content;
      }
    } catch (gqlErr) {
      console.warn("GraphQL files query fallback to REST:", gqlErr?.message || gqlErr);
    }

    // 2. Fallback to REST Asset API if needed
    if (!settingsContent && session?.accessToken) {
      try {
        const restUrl = `https://${session.shop}/admin/api/2024-10/themes/${themeNumericId}/assets.json?asset[key]=config/settings_data.json`;
        const restRes = await fetch(restUrl, {
          headers: {
            "X-Shopify-Access-Token": session.accessToken,
            "Content-Type": "application/json",
          },
        });
        if (restRes.ok) {
          const restData = await restRes.json();
          settingsContent = restData?.asset?.value;
        }
      } catch (restErr) {
        console.warn("REST asset fetch failed:", restErr?.message || restErr);
      }
    }

    if (!settingsContent) {
      return { verified: false, themeName, themeId: themeNumericId, error: "Could not read theme settings" };
    }

    const parsed = typeof settingsContent === "string" ? JSON.parse(settingsContent) : settingsContent;
    const blocks = {
      ...(parsed?.current?.blocks || {}),
      ...(parsed?.blocks || {}),
    };

    let isEmbedEnabled = false;
    for (const key of Object.keys(blocks)) {
      const blk = blocks[key];
      if (!blk) continue;
      const type = String(blk.type || "").toLowerCase();
      // Reviora's app embed block handle is "app_embed"
      const isEmbed = type.includes("app_embed") || (type.includes("reviora") && type.includes("embed"));
      if (isEmbed) {
        if (blk.disabled !== true) {
          isEmbedEnabled = true;
          break;
        }
      }
    }

    return {
      verified: isEmbedEnabled,
      themeName,
      themeId: themeNumericId,
      error: isEmbedEnabled ? null : "Reviora Reviews app embed is not enabled yet in your theme.",
    };
  } catch (err) {
    console.error("Theme verification error:", err?.message || err);
    return { verified: false, themeName: "Live Theme", error: err?.message || "Verification error" };
  }
}

export const loader = async ({ request }) => {
  const { session, admin, billing } = await authenticate.admin(request);
  const shop = session.shop;
  await connectDB();
  const shopSettings = await getShopSettings(shop);

  const url = new URL(request.url);
  const isTest =
    url.searchParams.get("test") === "true" ||
    url.searchParams.get("test") === "1";

  // Check live Shopify billing status for Pro plan
  let hasActivePayment = false;
  try {
    const billingCheck = await billing.check({
      plans: ["Pro"],
      isTest: isTest || process.env.NODE_ENV !== "production",
    });
    hasActivePayment = Boolean(billingCheck.hasActivePayment);
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
    console.error("Theme lookup error in onboarding:", err?.message || err);
  }

  const themeVerification = await verifyAppEmbedInTheme(admin, session);
  if (themeVerification?.themeId) {
    defaultThemeId = themeVerification.themeId;
  }

  const urlStep = parseInt(url.searchParams.get("step") || "0", 10);
  const dbStep = shopSettings?.onboardingStep || 1;
  let initialStep = 1;
  if (urlStep > 0) {
    initialStep = urlStep;
  } else if (!isTest) {
    initialStep = dbStep;
    if (hasActivePayment && initialStep < 4) {
      initialStep = 4;
    }
  }

  return {
    shopSettings,
    shop,
    apiKey: process.env.SHOPIFY_API_KEY || "f79eb2d3832f37be2bb3a5c7c1efd416",
    defaultThemeId,
    initialStep,
    hasActivePayment,
    currentPlan: hasActivePayment ? "PRO" : (shopSettings?.plan || "FREE"),
    isTest,
    initialThemeVerified: Boolean(themeVerification.verified),
    initialThemeName: themeVerification.themeName || "Live Theme",
  };
};

export const action = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get("actionType");

  if (actionType === "verifyTheme") {
    const result = await verifyAppEmbedInTheme(admin, session);
    return result;
  }

  if (actionType === "subscribePro") {
    try {
      const isTestEnv = process.env.NODE_ENV !== "production";
      const isTestParam = formData.get("isTest") === "true";
      const testFlag = isTestEnv || isTestParam;

      const cleanShop = session.shop.replace(".myshopify.com", "");
      const apiKey = process.env.SHOPIFY_API_KEY || "f79eb2d3832f37be2bb3a5c7c1efd416";
      const testQuery = testFlag ? "&test=true" : "";
      const returnUrl = `https://admin.shopify.com/store/${cleanShop}/apps/${apiKey}/app/onboarding?step=4${testQuery}`;

      const response = await admin.graphql(
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
            test: testFlag,
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

      const json = await response.json();
      const userErrors = json?.data?.appSubscriptionCreate?.userErrors;
      if (userErrors && userErrors.length > 0) {
        console.error("Shopify billing userErrors in onboarding:", userErrors);
        return { error: userErrors.map((e) => e.message).join(", ") };
      }

      const confirmationUrl = json?.data?.appSubscriptionCreate?.confirmationUrl;
      if (confirmationUrl) {
        return { confirmationUrl };
      }

      return { error: "No confirmation URL returned by Shopify." };
    } catch (err) {
      console.error("subscribePro error in onboarding:", err?.message || err);
      return { error: err?.message || "Failed to initiate billing request" };
    }
  }

  if (actionType === "saveOnboardingStep") {
    const isTest = formData.get("isTest") === "true";
    const step = parseInt(formData.get("step") || "1", 10);
    const plan = formData.get("plan");
    const primaryColor = formData.get("primaryColor");
    if (!isTest) {
      const update = { onboardingStep: step };
      if (plan) update.plan = plan;
      if (primaryColor) update.primaryColor = primaryColor;
      await updateShopSettings(session.shop, update);
    }
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

export default function OnboardingPage() {
  const loaderData = useLoaderData();
  const fetcher = useFetcher();
  const navigate = useNavigate();

  const shop = loaderData?.shop;
  const apiKey = loaderData?.apiKey;
  const defaultThemeId = loaderData?.defaultThemeId || "current";
  const isTest = Boolean(loaderData?.isTest);

  const handleCompleteOnboarding = ({ primaryColor, plan }) => {
    fetcher.submit(
      {
        actionType: "completeOnboarding",
        primaryColor,
        plan,
      },
      { method: "POST" }
    );

    navigate(`/app${typeof window !== "undefined" ? window.location.search : ""}`, { replace: true });
  };

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
        isTest={isTest}
        initialThemeVerified={Boolean(loaderData?.initialThemeVerified)}
        initialThemeName={loaderData?.initialThemeName || ""}
      />
    </s-page>
  );
}
