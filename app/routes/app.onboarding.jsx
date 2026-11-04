import { useLoaderData, useFetcher, useNavigate } from "react-router";
import { authenticate } from "../shopify.server.js";
import { getShopSettings, updateShopSettings } from "../models/review.server.js";
import { connectDB } from "../db.server.js";
import { OnboardingWizard } from "../components/OnboardingWizard.jsx";
import {
  checkProPlanActive,
  createProSubscription,
  cancelProSubscription,
} from "../utils/billing.server.js";
import process from "process";

async function verifyAppEmbedInTheme(admin, session, targetThemeId) {
  try {
    // 1. Fetch all store themes first to reliably resolve the target theme
    let themesList = [];
    try {
      const themesRes = await admin.graphql(
        `#graphql
        query getStoreThemesForVerification {
          themes(first: 25) {
            nodes {
              id
              name
              role
            }
          }
        }`
      );
      const themesJson = await themesRes.json();
      themesList = themesJson?.data?.themes?.nodes || [];
    } catch (err) {
      console.warn("Could not query themes list for verification:", err);
    }

    // 2. Match the specific theme selected by the user
    let liveTheme = null;
    const cleanTargetId = targetThemeId ? String(targetThemeId).split("/").pop() : null;

    if (cleanTargetId && cleanTargetId !== "current") {
      liveTheme = themesList.find((t) => t.id.split("/").pop() === cleanTargetId || t.id === targetThemeId);
    }

    // If no target or not found, default to MAIN (live) theme
    if (!liveTheme) {
      liveTheme = themesList.find((t) => t.role === "MAIN") || themesList[0];
    }

    if (!liveTheme) {
      return { verified: false, themeName: "Live Theme", error: "No themes found in store" };
    }

    const themeName = liveTheme.name;
    const themeNumericId = liveTheme.id.split("/").pop();
    const themeGid = liveTheme.id.startsWith("gid://") ? liveTheme.id : `gid://shopify/Theme/${themeNumericId}`;

    let settingsContent = null;
    let productTemplateContent = null;
    let indexTemplateContent = null;

    // 3. Try GraphQL node files query for settings_data.json and templates
    try {
      const filesRes = await admin.graphql(
        `#graphql
        query getThemeFilesForVerification($themeId: ID!) {
          node(id: $themeId) {
            ... on Theme {
              files(filenames: ["config/settings_data.json", "templates/product.json", "templates/index.json"], first: 5) {
                nodes {
                  filename
                  body {
                    ... on OnlineStoreThemeFileBodyText {
                      content
                    }
                  }
                }
              }
            }
          }
        }`,
        { variables: { themeId: themeGid } }
      );
      const filesJson = await filesRes.json();
      const nodes = filesJson?.data?.node?.files?.nodes || [];
      for (const node of nodes) {
        if (node.filename === "config/settings_data.json" && node.body?.content) {
          settingsContent = node.body.content;
        } else if (node.filename === "templates/product.json" && node.body?.content) {
          productTemplateContent = node.body.content;
        } else if (node.filename === "templates/index.json" && node.body?.content) {
          indexTemplateContent = node.body.content;
        }
      }
    } catch (gqlErr) {
      console.warn("GraphQL node files query fallback to REST:", gqlErr?.message || gqlErr);
    }

    // 4. Fallback to REST Asset API for settings_data.json if needed
    if (!settingsContent && session?.accessToken) {
      try {
        const restUrl = `https://${session.shop}/admin/api/2026-07/themes/${themeNumericId}/assets.json?asset[key]=config/settings_data.json`;
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

    let isEmbedOrWidgetEnabled = false;

    // Helper to check if a block type uniquely belongs to Reviora
    const isRevioraType = (type) => {
      const t = String(type || "").toLowerCase();
      return (
        t.includes("reviora") ||
        t.includes("65b30aae") ||
        t.includes("f79eb2d3832f37be2bb3a5c7c1efd416")
      );
    };

    // Helper to inspect parsed blocks in settings_data.json
    const checkBlocks = (parsed) => {
      if (!parsed) return false;
      const blocks = {
        ...(parsed?.current?.blocks || {}),
        ...(parsed?.blocks || {}),
      };
      for (const key of Object.keys(blocks)) {
        const blk = blocks[key];
        if (!blk) continue;
        if (isRevioraType(blk.type)) {
          if (blk.disabled === true || blk.disabled === "true") {
            continue;
          }
          return true;
        }
      }
      return false;
    };

    // Helper to check sections in templates (e.g. templates/product.json, index.json)
    const checkTemplateSections = (parsed) => {
      if (!parsed || !parsed.sections) return false;
      for (const secKey of Object.keys(parsed.sections)) {
        const sec = parsed.sections[secKey];
        if (!sec || !sec.blocks) continue;
        for (const blkKey of Object.keys(sec.blocks)) {
          const blk = sec.blocks[blkKey];
          if (!blk) continue;
          if (isRevioraType(blk.type)) {
            if (blk.disabled === true || blk.disabled === "true") {
              continue;
            }
            return true;
          }
        }
      }
      return false;
    };

    const parseJsonSafely = (content) => {
      if (!content) return null;
      if (typeof content === "object") return content;
      try {
        return JSON.parse(content);
      } catch {
        const firstBrace = content.indexOf("{");
        const lastBrace = content.lastIndexOf("}");
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          const jsonOnly = content.slice(firstBrace, lastBrace + 1);
          try {
            return JSON.parse(jsonOnly);
          } catch {
            const stripped = jsonOnly.replace(/\/\*[\s\S]*?\*\//g, "").trim();
            return JSON.parse(stripped);
          }
        }
      }
      return null;
    };

    // 1. Check config/settings_data.json (App Embeds)
    if (settingsContent) {
      const parsedSettings = parseJsonSafely(settingsContent);
      if (checkBlocks(parsedSettings)) {
        isEmbedOrWidgetEnabled = true;
      }
    }

    // 2. Check templates/product.json (Product template blocks)
    if (!isEmbedOrWidgetEnabled && productTemplateContent) {
      const parsedProduct = parseJsonSafely(productTemplateContent);
      if (checkTemplateSections(parsedProduct) || checkBlocks(parsedProduct)) {
        isEmbedOrWidgetEnabled = true;
      }
    }

    // 3. Check templates/index.json (Homepage blocks)
    if (!isEmbedOrWidgetEnabled && indexTemplateContent) {
      const parsedIndex = parseJsonSafely(indexTemplateContent);
      if (checkTemplateSections(parsedIndex) || checkBlocks(parsedIndex)) {
        isEmbedOrWidgetEnabled = true;
      }
    }

    return {
      verified: isEmbedOrWidgetEnabled,
      themeName,
      themeId: themeNumericId,
      error: isEmbedOrWidgetEnabled
        ? null
        : `Reviora app embed is not enabled yet in "${themeName}". Click 'Manage App Embed in Theme Editor' above, turn ON the toggle, and click Save.`,
    };
  } catch (err) {
    console.warn("Theme verification warning:", err?.message || err);
    return { verified: false, themeName: "Live Theme", error: null };
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

  // Check live Shopify billing status for Pro plan (accurately detects both test & live charges)
  const billingResult = await checkProPlanActive({ admin, billing, shop });
  const hasActivePayment = billingResult.hasActivePayment;

  let themes = [];
  let defaultThemeId = "current";
  try {
    const response = await admin.graphql(
      `#graphql
      query getStoreThemes {
        themes(first: 25) {
          nodes {
            id
            name
            role
          }
        }
      }`
    );
    const json = await response.json();
    const nodes = json?.data?.themes?.nodes || [];
    if (nodes.length > 0) {
      themes = nodes.map((t) => {
        const numericId = t.id ? t.id.split("/").pop() : "current";
        const isLive = t.role === "MAIN";
        return {
          id: numericId,
          name: t.name,
          role: t.role,
          isLive,
          label: isLive ? `${t.name} (live)` : `${t.name} (${t.role ? t.role.toLowerCase() : "unpublished"})`,
          value: numericId,
        };
      });
      themes.sort((a, b) => (b.isLive ? 1 : 0) - (a.isLive ? 1 : 0));
      defaultThemeId = themes[0]?.id || "current";
    }
  } catch (err) {
    console.error("Theme lookup error in onboarding:", err?.message || err);
  }

  const themeVerification = await verifyAppEmbedInTheme(admin, session, defaultThemeId);
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
    themes,
    initialStep,
    hasActivePayment,
    currentPlan: hasActivePayment ? "PRO" : (shopSettings?.plan || "FREE"),
    isTest,
    initialThemeVerified: Boolean(themeVerification.verified),
    initialThemeName: themeVerification.themeName || themes[0]?.name || "Live Theme",
  };
};

export const action = async ({ request }) => {
  const { session, admin, billing } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get("actionType");

  if (actionType === "verifyTheme") {
    const themeId = formData.get("themeId");
    const result = await verifyAppEmbedInTheme(admin, session, themeId);
    return result;
  }

  if (actionType === "downgradeFree") {
    const result = await cancelProSubscription({ admin, billing, shop: session.shop });
    return result;
  }

  if (actionType === "subscribePro") {
    const isTestParam = formData.get("isTest") === "true";
    const result = await createProSubscription({
      admin,
      billing,
      session,
      returnPath: "/app/onboarding?step=4&upgraded=true",
      isTestParam,
    });
    return result;
  }

  if (actionType === "saveOnboardingStep") {
    const step = parseInt(formData.get("step") || "1", 10);
    const plan = formData.get("plan");
    const primaryColor = formData.get("primaryColor");
    const update = { onboardingStep: step };
    if (primaryColor) update.primaryColor = primaryColor;

    if (plan === "FREE") {
      update.plan = "FREE";
      await cancelProSubscription({ admin, billing, shop: session.shop });
    }

    await updateShopSettings(session.shop, update);

    const billingResult = await checkProPlanActive({ admin, billing, shop: session.shop });
    return {
      success: true,
      onboardingStep: step,
      plan: billingResult.currentPlan,
      hasActivePayment: billingResult.hasActivePayment,
    };
  }

  if (actionType === "completeOnboarding") {
    const primaryColor = formData.get("primaryColor") || "#FFB800";
    const billingResult = await checkProPlanActive({ admin, billing, shop: session.shop });
    await updateShopSettings(session.shop, {
      onboardingCompleted: true,
      onboardingStep: 5,
      plan: billingResult.currentPlan,
      primaryColor,
    });
    return { success: true, onboardingCompleted: true, plan: billingResult.currentPlan };
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
        themes={loaderData?.themes || []}
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
