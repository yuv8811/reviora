import { useState, useMemo, useEffect } from "react";
import { useLoaderData, useSearchParams, useNavigation, useSubmit, useActionData } from "react-router";
import { authenticate } from "../shopify.server.js";
import { getAppPricingDetails } from "../utils/billing.server.js";
import { widgetsConfig } from "../config/widgets.config.jsx";
import { getShopSettings, updateWidgetSettings, getStorefrontReviews } from "../models/review.server.js";
import { CheckCircle2, Lock, FileText, Layers } from "lucide-react";
import { WidgetLivePreview } from "../components/WidgetLivePreview.jsx";
import { PageSkeleton } from "../components/PageSkeleton.jsx";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;

  // Real-time theme fetching via Admin GraphQL
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
  } catch (error) {
    console.error("Failed to query real-time themes:", error?.message || error);
  }

  if (themes.length === 0) {
    themes = [{ label: "Current Live Theme", value: "current", id: "current", isLive: true }];
  }

  const shopSettings = await getShopSettings(shop);
  const billingDetails = await getAppPricingDetails(admin, session);
  const currentPlan = billingDetails.currentPlan;

  // Load live reviews and aggregates from store for real-time live preview
  let realReviews = [];
  let aggregateData = null;
  try {
    const storefrontData = await getStorefrontReviews(shop, "all", { limit: 20 });
    realReviews = storefrontData?.reviews || [];
    aggregateData = {
      total: storefrontData?.total || 0,
      averageRating: storefrontData?.averageRating || 0,
      distribution: storefrontData?.distribution || {},
    };
  } catch (err) {
    console.warn("Could not load storefront reviews for widgets preview:", err?.message || err);
  }

  // eslint-disable-next-line no-undef
  const apiKey = process.env.SHOPIFY_API_KEY || "";

  return {
    shop,
    themes,
    defaultThemeId,
    apiKey,
    shopSettings,
    currentPlan,
    realReviews,
    aggregateData,
  };
};

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const widgetId = formData.get("widgetId");

  if (!widgetId) {
    return { error: "Widget ID is required" };
  }

  // Plan verification for PRO widgets
  const widgetDef = widgetsConfig.find((w) => w.id === widgetId);
  if (widgetDef?.isPremium) {
    const billingDetails = await getAppPricingDetails(admin, session);
    if (!billingDetails.hasActivePayment) {
      return {
        error: "This widget requires an active Reviora Pro plan ($4.99/mo). Please upgrade to save custom settings.",
      };
    }
  }

  const entries = Object.fromEntries(formData.entries());
  delete entries.widgetId;

  const formattedData = {};
  for (const [key, val] of Object.entries(entries)) {
    if (val === "true") formattedData[key] = true;
    else if (val === "false") formattedData[key] = false;
    else if (!isNaN(val) && typeof val === "string" && val.trim() !== "" && !val.startsWith("#")) {
      formattedData[key] = Number(val);
    } else {
      formattedData[key] = val;
    }
  }

  await updateWidgetSettings(session.shop, widgetId, formattedData);

  return { success: true, timestamp: Date.now() };
};

export default function WidgetsPage() {
  const { shop, themes, defaultThemeId, apiKey, shopSettings, currentPlan, realReviews, aggregateData } = useLoaderData();
  const [searchParams, setSearchParams] = useSearchParams();
  const actionData = useActionData();
  const navigation = useNavigation();
  const submit = useSubmit();

  const [selectedThemeId, setSelectedThemeId] = useState(defaultThemeId);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [proModalWidget, setProModalWidget] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [showAllReviewsModal, setShowAllReviewsModal] = useState(false);

  const handleOpenAllReviewsModal = () => {
    setShowAllReviewsModal(true);
    if (window.shopify?.modal) {
      window.shopify.modal.show("all-reviews-install-modal");
    } else {
      document.getElementById("all-reviews-install-modal")?.showOverlay();
    }
  };

  const handleCloseAllReviewsModal = () => {
    setShowAllReviewsModal(false);
    if (window.shopify?.modal) {
      window.shopify.modal.hide("all-reviews-install-modal");
    } else {
      document.getElementById("all-reviews-install-modal")?.hideOverlay();
    }
  };

  const handleOpenProModal = (widget) => {
    setProModalWidget(widget);
    if (window.shopify?.modal) {
      window.shopify.modal.show("upgrade-pro-modal");
    } else {
      document.getElementById("upgrade-pro-modal")?.showOverlay();
    }
  };

  const handleCloseProModal = () => {
    if (window.shopify?.modal) {
      window.shopify.modal.hide("upgrade-pro-modal");
    } else {
      document.getElementById("upgrade-pro-modal")?.hideOverlay();
    }
    setProModalWidget(null);
  };

  const handleNavigateToBilling = () => {
    window.location.href = "/app/billing";
  };

  // Studio customizer state
  const customizeWidgetId = searchParams.get("customize");
  const activeWidget = useMemo(
    () => widgetsConfig.find((w) => w.id === customizeWidgetId) || null,
    [customizeWidgetId]
  );

  const [settings, setSettings] = useState({});
  const isSaving = navigation.state === "submitting";

  useEffect(() => {
    if (activeWidget) {
      const saved = shopSettings?.widgetSettings?.[activeWidget.id] || {};
      setSettings({
        ...activeWidget.defaultSettings,
        ...saved,
      });
    }
  }, [activeWidget, shopSettings]);

  useEffect(() => {
    if (actionData?.success) {
      setShowSavedToast(true);
      const timer = setTimeout(() => setShowSavedToast(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [actionData]);

  const themeOptions = useMemo(
    () => themes.map((t) => ({ label: t.label, value: t.value })),
    [themes]
  );

  const getThemeEditorUrl = (template = "product", blockHandle) => {
    const base = `https://${shop}/admin/themes/${selectedThemeId}/editor?template=${template}`;
    if (apiKey && blockHandle) {
      return `${base}&addAppBlockId=${apiKey}/${blockHandle}&target=newAppsSection`;
    }
    return base;
  };

  const handleSettingChange = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!activeWidget) return;

    const payload = { widgetId: activeWidget.id };
    for (const [k, v] of Object.entries(settings)) {
      payload[k] = typeof v === "boolean" ? String(v) : v;
    }
    submit(payload, { method: "POST" });
  };

  const handleCopySnippet = (snippet) => {
    navigator.clipboard.writeText(snippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  // Show skeleton if page is in loading state
  const isLoading = navigation.state === "loading";
  if (isLoading) {
    return <PageSkeleton />;
  }

  // =========================================================================
  // VIEW 1: CUSTOMIZE WIDGET PAGE (App Bridge Native Layout)
  // =========================================================================
  if (activeWidget) {
    const isLocked = activeWidget.isPremium && currentPlan !== "PRO";
    const editorDeepLink = getThemeEditorUrl(activeWidget.template || "product", activeWidget.blockHandle);
    const snippetCode =
      typeof activeWidget.snippet === "function" ? activeWidget.snippet(shop) : activeWidget.snippet || "";

    return (
      <s-page heading={`Customize ${activeWidget.title}`} inlineSize="large">
        {/* Action Buttons */}
        {isLocked ? (
          <s-button
            slot="primary-action"
            variant="primary"
            onClick={() => handleOpenProModal(activeWidget)}
          >
            Upgrade to Pro to Save 🔒
          </s-button>
        ) : (
          <s-button
            slot="primary-action"
            variant="primary"
            onClick={handleSave}
            loading={isSaving ? true : undefined}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save changes"}
          </s-button>
        )}

        <s-button
          slot="secondary-actions"
          variant="secondary"
          onClick={() => setSearchParams({})}
        >
          ← Back to Widgets
        </s-button>

        <s-button
          slot="secondary-actions"
          variant="secondary"
          onClick={() => {
            if (isLocked) {
              handleOpenProModal(activeWidget);
            } else if (activeWidget.id === "all_reviews_page") {
              handleOpenAllReviewsModal();
            } else {
              window.open(editorDeepLink, "_blank", "noopener,noreferrer");
            }
          }}
        >
          {isLocked ? "Open in Theme Editor 🔒" : "Open in Theme Editor ↗"}
        </s-button>

        <s-stack gap="base">
          {isLocked && (
            <s-banner tone="warning" heading="PRO Feature: Upgrade Required">
              <s-stack gap="tight">
                <s-paragraph>
                  <strong>{activeWidget.title}</strong> is an exclusive Reviora Pro feature ($4.99/month). You can preview styling below, but an active Pro plan is required to save changes and install it on your live store.
                </s-paragraph>
                <div style={{ marginTop: "4px" }}>
                  <s-button variant="primary" onClick={() => handleOpenProModal(activeWidget)}>
                    Upgrade to Pro Plan ↗
                  </s-button>
                </div>
              </s-stack>
            </s-banner>
          )}

          {actionData?.error && (
            <s-banner tone="critical" heading="Subscription Notice">
              <s-paragraph>{actionData.error}</s-paragraph>
            </s-banner>
          )}

          {showSavedToast && (
            <s-banner tone="success" heading="Settings saved">
              <s-paragraph>Your widget configuration has been saved successfully.</s-paragraph>
            </s-banner>
          )}

          <s-grid gridTemplateColumns="340px 1fr" gap="base">
            {/* Left Column: Settings Configuration */}
            <s-stack gap="base">
              <s-section heading="Widget Details">
                <s-stack gap="small">
                  <s-text tone="subdued" size="small">
                    {activeWidget.description}
                  </s-text>
                  <s-box padding="base" background="subdued" borderRadius="base">
                    <s-stack gap="extra-tight">
                      <s-text size="small" weight="semibold">
                        Theme App Block Name:
                      </s-text>
                      <s-text size="small" tone="subdued">
                        {activeWidget.blockName}
                      </s-text>
                    </s-stack>
                  </s-box>
                </s-stack>
              </s-section>

              {/* Design & Colors */}
              <s-section heading="Design & Colors">
                <s-stack gap="base">
                  {settings.starColor !== undefined && (
                    <s-stack gap="extra-tight">
                      <label htmlFor="starColorInput" style={{ fontSize: "13px", fontWeight: "600", color: "#374151" }}>
                        Star & Rating Color
                      </label>
                      <s-stack direction="inline" gap="small" alignItems="center">
                        <input
                          type="color"
                          id="starColorInput"
                          value={settings.starColor || "#FFB800"}
                          onChange={(e) => handleSettingChange("starColor", e.target.value)}
                          style={{
                            width: "44px",
                            height: "36px",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            cursor: "pointer",
                            padding: "2px",
                            background: "#fff",
                          }}
                        />
                        <input
                          type="text"
                          aria-label="Star Color Hex"
                          value={settings.starColor || "#FFB800"}
                          onChange={(e) => handleSettingChange("starColor", e.target.value)}
                          style={{
                            height: "36px",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            padding: "0 10px",
                            fontSize: "13px",
                            width: "120px",
                          }}
                        />
                      </s-stack>
                    </s-stack>
                  )}

                  {settings.badgeColor !== undefined && (
                    <s-stack gap="extra-tight">
                      <label htmlFor="badgeColorInput" style={{ fontSize: "13px", fontWeight: "600", color: "#374151" }}>
                        Verified Badge Color
                      </label>
                      <s-stack direction="inline" gap="small" alignItems="center">
                        <input
                          type="color"
                          id="badgeColorInput"
                          value={settings.badgeColor || "#059669"}
                          onChange={(e) => handleSettingChange("badgeColor", e.target.value)}
                          style={{
                            width: "44px",
                            height: "36px",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            cursor: "pointer",
                            padding: "2px",
                            background: "#fff",
                          }}
                        />
                        <input
                          type="text"
                          aria-label="Badge Color Hex"
                          value={settings.badgeColor || "#059669"}
                          onChange={(e) => handleSettingChange("badgeColor", e.target.value)}
                          style={{
                            height: "36px",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            padding: "0 10px",
                            fontSize: "13px",
                            width: "120px",
                          }}
                        />
                      </s-stack>
                    </s-stack>
                  )}

                  {settings.accentColor !== undefined && (
                    <s-stack gap="extra-tight">
                      <label htmlFor="accentColorInput" style={{ fontSize: "13px", fontWeight: "600", color: "#374151" }}>
                        Accent Color
                      </label>
                      <s-stack direction="inline" gap="small" alignItems="center">
                        <input
                          type="color"
                          id="accentColorInput"
                          value={settings.accentColor || "#10B981"}
                          onChange={(e) => handleSettingChange("accentColor", e.target.value)}
                          style={{
                            width: "44px",
                            height: "36px",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            cursor: "pointer",
                            padding: "2px",
                            background: "#fff",
                          }}
                        />
                        <input
                          type="text"
                          aria-label="Accent Color Hex"
                          value={settings.accentColor || "#10B981"}
                          onChange={(e) => handleSettingChange("accentColor", e.target.value)}
                          style={{
                            height: "36px",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            padding: "0 10px",
                            fontSize: "13px",
                            width: "120px",
                          }}
                        />
                      </s-stack>
                    </s-stack>
                  )}

                  {settings.textColor !== undefined && (
                    <s-stack gap="extra-tight">
                      <label htmlFor="textColorInput" style={{ fontSize: "13px", fontWeight: "600", color: "#374151" }}>
                        Text Color
                      </label>
                      <s-stack direction="inline" gap="small" alignItems="center">
                        <input
                          type="color"
                          id="textColorInput"
                          value={settings.textColor || "#0F172A"}
                          onChange={(e) => handleSettingChange("textColor", e.target.value)}
                          style={{
                            width: "44px",
                            height: "36px",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            cursor: "pointer",
                            padding: "2px",
                            background: "#fff",
                          }}
                        />
                        <input
                          type="text"
                          aria-label="Text Color Hex"
                          value={settings.textColor || "#0F172A"}
                          onChange={(e) => handleSettingChange("textColor", e.target.value)}
                          style={{
                            height: "36px",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            padding: "0 10px",
                            fontSize: "13px",
                            width: "120px",
                          }}
                        />
                      </s-stack>
                    </s-stack>
                  )}

                  {settings.buttonColor !== undefined && (
                    <s-stack gap="extra-tight">
                      <label htmlFor="buttonColorInput" style={{ fontSize: "13px", fontWeight: "600", color: "#374151" }}>
                        Button Background Color
                      </label>
                      <s-stack direction="inline" gap="small" alignItems="center">
                        <input
                          type="color"
                          id="buttonColorInput"
                          value={settings.buttonColor || "#10B981"}
                          onChange={(e) => handleSettingChange("buttonColor", e.target.value)}
                          style={{
                            width: "44px",
                            height: "36px",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            cursor: "pointer",
                            padding: "2px",
                            background: "#fff",
                          }}
                        />
                        <input
                          type="text"
                          aria-label="Button Color Hex"
                          value={settings.buttonColor || "#10B981"}
                          onChange={(e) => handleSettingChange("buttonColor", e.target.value)}
                          style={{
                            height: "36px",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            padding: "0 10px",
                            fontSize: "13px",
                            width: "120px",
                          }}
                        />
                      </s-stack>
                    </s-stack>
                  )}

                  {settings.layout !== undefined && (
                    <s-select
                      label="Layout Style"
                      value={settings.layout || "standard"}
                      onChange={(e) => handleSettingChange("layout", e.target.value)}
                    >
                      <s-option value="standard">Standard</s-option>
                      <s-option value="compact">Compact</s-option>
                      <s-option value="grid">Grid (Cards)</s-option>
                    </s-select>
                  )}

                  {settings.position !== undefined && (
                    <s-select
                      label="Screen Position"
                      value={settings.position || "bottom-right"}
                      onChange={(e) => handleSettingChange("position", e.target.value)}
                    >
                      <s-option value="bottom-right">Bottom Right</s-option>
                      <s-option value="bottom-left">Bottom Left</s-option>
                      <s-option value="mid-right">Center Right</s-option>
                      <s-option value="mid-left">Center Left</s-option>
                    </s-select>
                  )}

                  {settings.alignment !== undefined && (
                    <s-select
                      label="Alignment"
                      value={settings.alignment || "left"}
                      onChange={(e) => handleSettingChange("alignment", e.target.value)}
                    >
                      <s-option value="left">Left</s-option>
                      <s-option value="center">Center</s-option>
                      <s-option value="right">Right</s-option>
                    </s-select>
                  )}

                  {settings.columns !== undefined && (
                    <s-select
                      label="Columns per row"
                      value={String(settings.columns || "4")}
                      onChange={(e) => handleSettingChange("columns", e.target.value)}
                    >
                      <s-option value="3">3 Columns</s-option>
                      <s-option value="4">4 Columns</s-option>
                      <s-option value="5">5 Columns</s-option>
                    </s-select>
                  )}

                  {settings.bgColor !== undefined && (
                    <s-stack gap="extra-tight">
                      <label htmlFor="bgColorInput" style={{ fontSize: "13px", fontWeight: "600", color: "#374151" }}>
                        Background Color
                      </label>
                      <s-stack direction="inline" gap="small" alignItems="center">
                        <input
                          type="color"
                          id="bgColorInput"
                          value={settings.bgColor || "#0F172A"}
                          onChange={(e) => handleSettingChange("bgColor", e.target.value)}
                          style={{
                            width: "44px",
                            height: "36px",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            cursor: "pointer",
                            padding: "2px",
                            background: "#fff",
                          }}
                        />
                        <input
                          type="text"
                          aria-label="Background Color Hex"
                          value={settings.bgColor || "#0F172A"}
                          onChange={(e) => handleSettingChange("bgColor", e.target.value)}
                          style={{
                            height: "36px",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            padding: "0 10px",
                            fontSize: "13px",
                            width: "120px",
                          }}
                        />
                      </s-stack>
                    </s-stack>
                  )}
                </s-stack>
              </s-section>

              {/* Content & Options */}
              <s-section heading="Content & Options">
                <s-stack gap="base">
                  {(settings.headerTitle !== undefined || settings.heading !== undefined) && (
                    <s-text-field
                      label="Widget Title / Heading"
                      value={settings.headerTitle || settings.heading || ""}
                      onInput={(e) =>
                        handleSettingChange(
                          settings.headerTitle !== undefined ? "headerTitle" : "heading",
                          e.target.value
                        )
                      }
                    />
                  )}

                  {settings.subheading !== undefined && (
                    <s-text-field
                      label="Subheading"
                      value={settings.subheading || ""}
                      onInput={(e) => handleSettingChange("subheading", e.target.value)}
                    />
                  )}

                  {settings.buttonText !== undefined && (
                    activeWidget?.id === "trust_badge" ? (
                      <s-stack gap="extra-tight">
                        <s-text-field
                          label="Badge Text Template"
                          value={settings.buttonText || ""}
                          onInput={(e) => handleSettingChange("buttonText", e.target.value)}
                        />
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginTop: "4px" }}>
                          <span style={{ fontSize: "11px", color: "#64748b" }}>Insert tag:</span>
                          <button
                            type="button"
                            onClick={() => {
                              const cur = settings.buttonText || "";
                              handleSettingChange("buttonText", cur ? `${cur} {rating}` : "{rating}");
                            }}
                            style={{
                              background: "#f1f5f9",
                              border: "1px solid #cbd5e1",
                              borderRadius: "4px",
                              padding: "2px 7px",
                              fontSize: "11px",
                              fontWeight: "600",
                              cursor: "pointer",
                              color: "#0f172a",
                            }}
                          >
                            &#123;rating&#125; (Avg Rating)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const cur = settings.buttonText || "";
                              handleSettingChange("buttonText", cur ? `${cur} {count}` : "{count}");
                            }}
                            style={{
                              background: "#f1f5f9",
                              border: "1px solid #cbd5e1",
                              borderRadius: "4px",
                              padding: "2px 7px",
                              fontSize: "11px",
                              fontWeight: "600",
                              cursor: "pointer",
                              color: "#0f172a",
                            }}
                          >
                            &#123;count&#125; (Review Count)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleSettingChange("buttonText", "{rating}/5 from {count}+ Verified Buyers");
                            }}
                            style={{
                              background: "#ecfdf5",
                              border: "1px solid #a7f3d0",
                              borderRadius: "4px",
                              padding: "2px 7px",
                              fontSize: "11px",
                              fontWeight: "600",
                              cursor: "pointer",
                              color: "#065f46",
                            }}
                          >
                            Reset to Dynamic Default
                          </button>
                        </div>
                        <s-text size="small" tone="subdued">
                          Tags are automatically replaced with real review numbers on your live store.
                        </s-text>
                      </s-stack>
                    ) : (
                      <s-text-field
                        label="Button Text"
                        value={settings.buttonText || ""}
                        onInput={(e) => handleSettingChange("buttonText", e.target.value)}
                      />
                    )
                  )}

                  {settings.tabText !== undefined && (
                    <s-text-field
                      label="Floating Tab Text"
                      value={settings.tabText || ""}
                      onInput={(e) => handleSettingChange("tabText", e.target.value)}
                    />
                  )}

                  {settings.interval !== undefined && (
                    <s-select
                      label="Notification Interval"
                      value={String(settings.interval || 6)}
                      onChange={(e) => handleSettingChange("interval", Number(e.target.value))}
                    >
                      <s-option value="4">4 seconds</s-option>
                      <s-option value="6">6 seconds</s-option>
                      <s-option value="8">8 seconds</s-option>
                      <s-option value="10">10 seconds</s-option>
                    </s-select>
                  )}

                  {settings.showVerifiedBadge !== undefined && (
                    <s-checkbox
                      label="Show 'Verified Buyer' badge"
                      checked={Boolean(settings.showVerifiedBadge)}
                      onChange={(e) => handleSettingChange("showVerifiedBadge", e.target.checked)}
                    />
                  )}

                  {settings.hideIfEmpty !== undefined && (
                    <s-checkbox
                      label="Hide widget if product has 0 reviews"
                      checked={Boolean(settings.hideIfEmpty)}
                      onChange={(e) => handleSettingChange("hideIfEmpty", e.target.checked)}
                    />
                  )}

                  {settings.showBreakdown !== undefined && (
                    <s-checkbox
                      label="Show Rating Breakdown summary bar"
                      checked={Boolean(settings.showBreakdown)}
                      onChange={(e) => handleSettingChange("showBreakdown", e.target.checked)}
                    />
                  )}

                  {settings.showRatingFilter !== undefined && (
                    <s-checkbox
                      label="Enable 1-5 Star filter buttons"
                      checked={Boolean(settings.showRatingFilter)}
                      onChange={(e) => handleSettingChange("showRatingFilter", e.target.checked)}
                    />
                  )}

                  {settings.showMediaUpload !== undefined && (
                    <s-checkbox
                      label="Allow customer photo & video uploads"
                      checked={Boolean(settings.showMediaUpload)}
                      onChange={(e) => handleSettingChange("showMediaUpload", e.target.checked)}
                    />
                  )}

                  {settings.showNumericRating !== undefined && (
                    <s-checkbox
                      label="Display numeric score (e.g. 4.9)"
                      checked={Boolean(settings.showNumericRating)}
                      onChange={(e) => handleSettingChange("showNumericRating", e.target.checked)}
                    />
                  )}

                  {settings.showReviewCount !== undefined && (
                    <s-checkbox
                      label="Display total review count"
                      checked={Boolean(settings.showReviewCount)}
                      onChange={(e) => handleSettingChange("showReviewCount", e.target.checked)}
                    />
                  )}

                  {settings.autoplay !== undefined && (
                    <s-checkbox
                      label="Autoplay carousel slides"
                      checked={Boolean(settings.autoplay)}
                      onChange={(e) => handleSettingChange("autoplay", e.target.checked)}
                    />
                  )}

                  {settings.reviewsPerPage !== undefined && (
                    <s-select
                      label="Reviews per page"
                      value={String(settings.reviewsPerPage || 5)}
                      onChange={(e) => handleSettingChange("reviewsPerPage", Number(e.target.value))}
                    >
                      <s-option value="3">3 reviews</s-option>
                      <s-option value="5">5 reviews</s-option>
                      <s-option value="10">10 reviews</s-option>
                    </s-select>
                  )}

                  {settings.limit !== undefined && (
                    <s-select
                      label="Max reviews to display"
                      value={String(settings.limit || 6)}
                      onChange={(e) => handleSettingChange("limit", Number(e.target.value))}
                    >
                      <s-option value="4">4 reviews</s-option>
                      <s-option value="6">6 reviews</s-option>
                      <s-option value="8">8 reviews</s-option>
                      <s-option value="12">12 reviews</s-option>
                    </s-select>
                  )}
                </s-stack>
              </s-section>
            </s-stack>

            {/* Right Column: Preview & Installation */}
            <s-stack gap="base">
              <s-section heading="Widget Preview">
                <s-stack gap="base">
                  <WidgetLivePreview
                    widgetId={activeWidget.id}
                    settings={settings}
                    realReviews={realReviews}
                    aggregateData={aggregateData}
                  />

                  <s-text tone="subdued" size="small">
                    Colors and titles configured on the left will automatically apply to this block on your live store.
                  </s-text>
                </s-stack>
              </s-section>

              <s-section heading="Installation & Theme Editor">
                <s-stack gap="base">
                  <s-stack gap="small">
                    <s-heading size="small">How to add to your theme:</s-heading>
                    <s-stack direction="inline" gap="small" alignItems="center">
                      <CheckCircle2 size={16} color="#059669" />
                      <s-text size="small">
                        1. Click <strong>Open in Theme Editor</strong> below.
                      </s-text>
                    </s-stack>
                    <s-stack direction="inline" gap="small" alignItems="center">
                      <CheckCircle2 size={16} color="#059669" />
                      <s-text size="small">
                        2. In the template sections panel, click <strong>Add block</strong> or <strong>Add section</strong>.
                      </s-text>
                    </s-stack>
                    <s-stack direction="inline" gap="small" alignItems="center">
                      <CheckCircle2 size={16} color="#059669" />
                      <s-text size="small">
                        3. Select <strong>{activeWidget.blockName}</strong>, position it, and click <strong>Save</strong>.
                      </s-text>
                    </s-stack>
                  </s-stack>

                  {isLocked ? (
                    <s-button
                      variant="primary"
                      onClick={() => handleOpenProModal(activeWidget)}
                    >
                      Unlock in Theme Editor (Requires Pro) 🔒
                    </s-button>
                  ) : (
                    <s-button
                      variant="primary"
                      onClick={() => {
                        if (activeWidget.id === "all_reviews_page") {
                          handleOpenAllReviewsModal();
                        } else {
                          window.open(editorDeepLink, "_blank", "noopener,noreferrer");
                        }
                      }}
                    >
                      Open in Theme Editor ↗
                    </s-button>
                  )}

                  <s-divider></s-divider>

                  <s-stack gap="small">
                    <s-stack direction="inline" justifyContent="space-between" alignItems="center">
                      <s-text size="small" weight="semibold">
                        Liquid / HTML Snippet:
                      </s-text>
                      <s-button
                        variant="tertiary"
                        onClick={() => handleCopySnippet(snippetCode)}
                      >
                        {copiedSnippet ? "Copied!" : "Copy Snippet"}
                      </s-button>
                    </s-stack>
                    <s-box padding="base" background="subdued" borderRadius="base">
                      <pre
                        style={{
                          margin: 0,
                          fontSize: "11px",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-all",
                          fontFamily: "monospace",
                        }}
                      >
                        {snippetCode}
                      </pre>
                    </s-box>
                  </s-stack>
                </s-stack>
              </s-section>
            </s-stack>
          </s-grid>
        </s-stack>
        {renderUpgradeProModal()}
        {renderAllReviewsModal()}
      </s-page>
    );
  }

  // Local helper for Upgrade PRO Modal
  function renderUpgradeProModal() {
    return (
      <s-modal
        id="upgrade-pro-modal"
        heading={`Unlock ${proModalWidget?.title || "Premium Widget"} with Pro`}
      >
        <s-stack gap="base">
          <s-banner tone="info">
            <s-paragraph>
              <strong>{proModalWidget?.title || "This widget"}</strong> is an exclusive <strong>Reviora Pro</strong> feature at only <strong>$4.99/month</strong>.
            </s-paragraph>
          </s-banner>

          <s-stack gap="tight">
            <s-text type="strong">Everything included with Pro:</s-text>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <CheckCircle2 size={16} color="#10b981" />
              <s-text size="small">Automated &amp; manual review request emails by order</s-text>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <CheckCircle2 size={16} color="#10b981" />
              <s-text size="small">All 4 Premium Widgets: Video Reels, UGC Wall, Review Popups &amp; Floating Drawer</s-text>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <CheckCircle2 size={16} color="#10b981" />
              <s-text size="small">Customer photo &amp; video uploads with fast CDN hosting</s-text>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <CheckCircle2 size={16} color="#10b981" />
              <s-text size="small">Save custom widget styling &amp; live theme editor sync</s-text>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <CheckCircle2 size={16} color="#10b981" />
              <s-text size="small">Google Shopping &amp; Rich Snippets (Schema.org JSON-LD)</s-text>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <CheckCircle2 size={16} color="#10b981" />
              <s-text size="small">Priority 24/7 Live Chat &amp; Email Support</s-text>
            </div>
          </s-stack>
        </s-stack>

        <s-button
          slot="primary-action"
          variant="primary"
          onClick={handleNavigateToBilling}
        >
          Upgrade to Pro ($4.99/mo) ↗
        </s-button>
        <s-button
          slot="secondary-actions"
          commandFor="upgrade-pro-modal"
          command="--hide"
          onClick={handleCloseProModal}
        >
          Maybe Later
        </s-button>
      </s-modal>
    );
  }

  // Local helper for All Reviews Page Install Modal
  function renderAllReviewsModal() {
    const newPageUrl = `https://${shop}/admin/pages/new`;
    const pageEditorUrl = `https://${shop}/admin/themes/${selectedThemeId}/editor?template=page&addAppBlockId=${apiKey}/all_reviews_page&target=newAppsSection`;
    const homeEditorUrl = `https://${shop}/admin/themes/${selectedThemeId}/editor?template=index&addAppBlockId=${apiKey}/all_reviews_page&target=newAppsSection`;

    return (
      <s-modal
        id="all-reviews-install-modal"
        heading="Install All Reviews Page Widget"
      >
        <s-stack gap="base">
          <s-paragraph color="subdued">
            Choose your preferred setup method below to activate your all-store reviews center:
          </s-paragraph>

          {/* Option 1: Create a Dedicated Reviews Page */}
          <div
            style={{
              padding: "18px 20px",
              borderRadius: "12px",
              border: "1px solid #10b981",
              backgroundColor: "#f0fdf4",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              boxShadow: "0 1px 3px rgba(16, 185, 129, 0.08)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    backgroundColor: "#d1fae5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#059669",
                    flexShrink: 0,
                  }}
                >
                  <FileText size={18} strokeWidth={2.2} />
                </div>
                <div>
                  <div style={{ fontSize: "15px", fontWeight: "600", color: "#065f46" }}>
                    Option 1: Create a Dedicated Reviews Page
                  </div>
                  <div style={{ fontSize: "12px", color: "#047857" }}>
                    Creates a dedicated URL (e.g. <code>/pages/reviews</code>)
                  </div>
                </div>
              </div>
              <s-badge tone="success">Recommended for SEO</s-badge>
            </div>

            <s-paragraph color="subdued">
              Best for building strong store trust and ranking on Google. Follow this quick 2-step setup:
            </s-paragraph>

            {/* 2-Step Interactive Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "2px" }}>
              {/* Step 1 Card */}
              <div
                style={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #a7f3d0",
                  borderRadius: "8px",
                  padding: "12px 14px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "10px",
                }}
              >
                <div>
                  <div style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "#059669", letterSpacing: "0.04em", marginBottom: "2px" }}>
                    Step 1
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: "600", color: "#1e293b" }}>
                    Create Shopify Page
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px", lineHeight: "1.3" }}>
                    Title it &quot;Reviews&quot; or &quot;Customer Reviews&quot; and save.
                  </div>
                </div>
                <s-button
                  variant="primary"
                  onClick={() => window.open(newPageUrl, "_blank", "noopener,noreferrer")}
                >
                  Create Page in Shopify ↗
                </s-button>
              </div>

              {/* Step 2 Card */}
              <div
                style={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #a7f3d0",
                  borderRadius: "8px",
                  padding: "12px 14px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "10px",
                }}
              >
                <div>
                  <div style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "#059669", letterSpacing: "0.04em", marginBottom: "2px" }}>
                    Step 2
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: "600", color: "#1e293b" }}>
                    Add Reviews Widget
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px", lineHeight: "1.3" }}>
                    Theme Editor opens with the widget block pre-selected.
                  </div>
                </div>
                <s-button
                  variant="secondary"
                  onClick={() => window.open(pageEditorUrl, "_blank", "noopener,noreferrer")}
                >
                  Open in Theme Editor ↗
                </s-button>
              </div>
            </div>
          </div>

          {/* Option 2: Add to an Existing Page */}
          <div
            style={{
              padding: "18px 20px",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              backgroundColor: "#f8fafc",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  backgroundColor: "#e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#475569",
                  flexShrink: 0,
                }}
              >
                <Layers size={18} strokeWidth={2.2} />
              </div>
              <div>
                <div style={{ fontSize: "15px", fontWeight: "600", color: "#1e293b" }}>
                  Option 2: Add as a Section to an Existing Page
                </div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>
                  Embed on your Homepage, About Us, or a custom landing page
                </div>
              </div>
            </div>

            <s-paragraph color="subdued">
              Select where you want to embed the all-store reviews section in your theme editor:
            </s-paragraph>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              <s-button
                variant="secondary"
                onClick={() => window.open(pageEditorUrl, "_blank", "noopener,noreferrer")}
              >
                Add to Standard Page Template ↗
              </s-button>
              <s-button
                variant="secondary"
                onClick={() => window.open(homeEditorUrl, "_blank", "noopener,noreferrer")}
              >
                Add to Homepage ↗
              </s-button>
            </div>
          </div>

          {/* Helpful Navigation Tip */}
          <div style={{ padding: "10px 14px", backgroundColor: "#fffbeb", border: "1px solid #fef3c7", borderRadius: "8px", fontSize: "12px", color: "#92400e", display: "flex", alignItems: "center", gap: "6px" }}>
            <span>💡</span>
            <span>
              <strong>Tip:</strong> After creating your page, remember to link it in your store&apos;s header or footer menu under <strong>Online Store &gt; Navigation</strong>.
            </span>
          </div>
        </s-stack>

        <s-button
          slot="secondary-actions"
          commandFor="all-reviews-install-modal"
          command="--hide"
          onClick={handleCloseAllReviewsModal}
        >
          Cancel
        </s-button>
      </s-modal>
    );
  }

  // =========================================================================
  // VIEW 2: ALL WIDGETS LIST (Standard App Bridge Page)
  // =========================================================================
  return (
    <s-page heading="Widgets">
      <s-stack gap="base">
        {/* Pro Banner for Free Merchants */}
        {currentPlan !== "PRO" && (
          <s-banner tone="info" heading="Supercharge Your Store with PRO Widgets">
            <s-stack gap="extra-tight">
              <s-paragraph>
                Unlock high-converting premium widgets like <strong>Video Reels</strong>, <strong>UGC Photo & Video Wall</strong>, <strong>Social Proof Review Toasts</strong>, and the <strong>Floating Reviews Drawer</strong> with Reviora Pro for only $4.99/month.
              </s-paragraph>
              <div style={{ marginTop: "6px" }}>
                <s-button variant="secondary" onClick={handleNavigateToBilling}>
                  View Pro Plan ($4.99/mo) ↗
                </s-button>
              </div>
            </s-stack>
          </s-banner>
        )}

        {/* Theme Selector Section */}
        <s-section>
          <s-stack
            direction="inline"
            justifyContent="space-between"
            alignItems="center"
            wrap="wrap"
            gap="base"
          >
            <s-stack gap="extra-tight">
              <s-heading size="small">Storefront Widgets</s-heading>
              <s-text tone="subdued" size="small">
                Manage, install, and customize review widgets across your store themes.
              </s-text>
            </s-stack>

            <div style={{ minWidth: "260px" }}>
              <s-select
                label="Select Theme to Customize"
                value={selectedThemeId}
                onChange={(e) => setSelectedThemeId(e.target.value)}
              >
                {themeOptions.map((opt) => (
                  <s-option key={opt.value} value={opt.value}>
                    {opt.label}
                  </s-option>
                ))}
              </s-select>
            </div>
          </s-stack>
        </s-section>

        {/* Dynamic Widgets Grid */}
        <s-grid gridTemplateColumns="repeat(auto-fit, minmax(280px, 1fr))" gap="base">
          {widgetsConfig.map((widget) => {
            const isLocked = widget.isPremium && currentPlan !== "PRO";
            const editorUrl = getThemeEditorUrl(widget.template || "product", widget.blockHandle);

            return (
              <s-section key={widget.id}>
                <s-stack gap="base">
                  {/* Top Graphic Header */}
                  <div
                    style={{
                      height: "175px",
                      background:
                        widget.preview?.gradient ||
                        "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "8px",
                      padding: "12px",
                      boxSizing: "border-box",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    {isLocked && (
                      <div
                        style={{
                          position: "absolute",
                          top: "10px",
                          right: "10px",
                          background: "rgba(15, 23, 42, 0.88)",
                          backdropFilter: "blur(6px)",
                          color: "#fef08a",
                          padding: "4px 8px",
                          borderRadius: "12px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          fontSize: "11px",
                          fontWeight: "700",
                          zIndex: 2,
                          boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
                        }}
                      >
                        <Lock size={12} color="#fef08a" /> PRO Feature
                      </div>
                    )}

                    {widget.preview?.render ? (
                      widget.preview.render()
                    ) : (
                      <div
                        style={{
                          width: "86%",
                          background: "#ffffff",
                          borderRadius: "8px",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                          padding: "16px",
                          textAlign: "center",
                        }}
                      >
                        <div style={{ fontSize: "24px", marginBottom: "6px" }}>
                          {widget.preview?.icon || "✨"}
                        </div>
                        <div style={{ fontSize: "12px", fontWeight: "700", color: "#1e293b" }}>
                          {widget.title}
                        </div>
                        <div style={{ fontSize: "10px", color: "#64748b", marginTop: "4px" }}>
                          {widget.blockName || "Theme App Block"}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Body */}
                  <s-stack gap="small">
                    <s-stack direction="inline" justifyContent="space-between" alignItems="center">
                      <s-heading size="small">{widget.title}</s-heading>
                      {widget.isPremium ? (
                        currentPlan === "PRO" ? (
                          <s-badge tone="success">PRO Active</s-badge>
                        ) : (
                          <s-badge tone="warning">PRO</s-badge>
                        )
                      ) : widget.badge ? (
                        <s-badge tone={widget.badgeTone || "success"}>{widget.badge}</s-badge>
                      ) : null}
                    </s-stack>

                    <div style={{ minHeight: "44px" }}>
                      <s-text tone="subdued" size="small">
                        {widget.description}
                      </s-text>
                    </div>

                    <s-stack direction="inline" gap="small" alignItems="center">
                      {isLocked ? (
                        <>
                          <s-button
                            size="slim"
                            variant="primary"
                            onClick={() => handleOpenProModal(widget)}
                          >
                            Unlock with Pro 🔒
                          </s-button>

                          <s-button
                            size="slim"
                            variant="secondary"
                            onClick={() => setSearchParams({ customize: widget.id })}
                          >
                            Preview
                          </s-button>
                        </>
                      ) : (
                        <>
                          <s-button
                            size="slim"
                            variant="primary"
                            onClick={() => {
                              if (widget.id === "all_reviews_page") {
                                handleOpenAllReviewsModal();
                              } else {
                                window.open(editorUrl, "_blank", "noopener,noreferrer");
                              }
                            }}
                          >
                            Install ↗
                          </s-button>

                          <s-button
                            size="slim"
                            variant="secondary"
                            onClick={() => setSearchParams({ customize: widget.id })}
                          >
                            Customize
                          </s-button>
                        </>
                      )}
                    </s-stack>
                  </s-stack>
                </s-stack>
              </s-section>
            );
          })}
        </s-grid>
      </s-stack>
      {renderUpgradeProModal()}
      {renderAllReviewsModal()}
    </s-page>
  );
}
