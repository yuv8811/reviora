import { useState, useEffect } from "react";
import { useFetcher } from "react-router";
import {
  Check,
  Camera,
  LayoutGrid,
  Download,
  ExternalLink,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  RefreshCw,
  Layers,
  Eye,
  Code2,
  CheckCircle2,
} from "lucide-react";
import { widgetsConfig } from "../config/widgets.config.jsx";

export function OnboardingWizard({
  shop,
  apiKey,
  defaultThemeId = "current",
  onComplete,
  initialStep = 1,
  hasActivePayment = false,
  currentPlan = "FREE",
  isTest = false,
  initialThemeVerified = false,
  initialThemeName = "",
}) {
  const [currentStep, setCurrentStep] = useState(() => {
    if (isTest) {
      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        const urlStep = parseInt(urlParams.get("step") || "0", 10);
        if (urlStep >= 1 && urlStep <= 5) return urlStep;
      }
      return initialStep || 1;
    }
    if (initialStep && initialStep > 1) return initialStep;
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(`reviora_onboarding_step_${shop}`);
        const parsed = parseInt(saved, 10);
        if (parsed >= 1 && parsed <= 5) return parsed;
      } catch (e) {
        // ignore
      }
    }
    return 1;
  });

  // eslint-disable-next-line no-unused-vars
  const [selectedColor, setSelectedColor] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(`reviora_selected_color_${shop}`);
        if (saved) return saved;
      } catch (e) {
        // ignore
      }
    }
    return "#FFB800";
  });

  const [selectedPlan, setSelectedPlan] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(`reviora_selected_plan_${shop}`);
        if (saved === "PRO" || saved === "FREE") return saved;
      } catch (e) {
        // ignore
      }
    }
    if (hasActivePayment || currentPlan === "PRO") return "PRO";
    return "FREE";
  });

  const [subscribeError, setSubscribeError] = useState("");
  const [isFinishing, setIsFinishing] = useState(false);
  const [themeVerified, setThemeVerified] = useState(Boolean(initialThemeVerified));
  const [themeName, setThemeName] = useState(initialThemeName || "");
  const [verificationError, setVerificationError] = useState("");

  const totalSteps = 5;
  const [selectedWidgetId, setSelectedWidgetId] = useState("review_widget");

  const billingFetcher = useFetcher();
  const themeFetcher = useFetcher();
  const stepFetcher = useFetcher();

  const changeStep = (nextStep) => {
    setCurrentStep(nextStep);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`reviora_onboarding_step_${shop}`, String(nextStep));
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set("step", String(nextStep));
        if (isTest) {
          currentUrl.searchParams.set("test", "true");
        }
        window.history.replaceState({}, "", currentUrl.toString());
      } catch (e) {
        // ignore
      }
    }
    stepFetcher.submit(
      {
        actionType: "saveOnboardingStep",
        step: String(nextStep),
        plan: selectedPlan || "FREE",
        primaryColor: selectedColor,
        isTest: isTest ? "true" : "false",
      },
      { method: "POST" }
    );
  };

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`reviora_selected_plan_${shop}`, plan);
      } catch (e) {
        // 
      }
    }
    stepFetcher.submit(
      {
        actionType: "saveOnboardingStep",
        step: String(currentStep),
        plan,
        primaryColor: selectedColor,
        isTest: isTest ? "true" : "false",
      },
      { method: "POST" }
    );
  };


  useEffect(() => {
    if (!isTest && hasActivePayment && currentStep < 4) {
      changeStep(4);
      setSelectedPlan("PRO");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasActivePayment, isTest]);

  const isSubscribingPro =
    billingFetcher.state === "submitting" ||
    billingFetcher.state === "loading" ||
    Boolean(billingFetcher.data?.confirmationUrl);

  const isVerifying =
    themeFetcher.state === "submitting" ||
    themeFetcher.state === "loading";

  // Redirect to Shopify subscription confirmation page when confirmationUrl is returned
  useEffect(() => {
    if (billingFetcher.data?.confirmationUrl) {
      const url = billingFetcher.data.confirmationUrl;
      if (window.shopify?.open) {
        window.shopify.open(url, "_top");
      } else {
        window.open(url, "_top");
      }
    }
  }, [billingFetcher.data?.confirmationUrl]);

  // Capture billing error if any
  useEffect(() => {
    if (billingFetcher.data?.error) {
      setSubscribeError(billingFetcher.data.error);
    }
  }, [billingFetcher.data?.error]);

  // Capture theme verification response
  useEffect(() => {
    if (themeFetcher.data) {
      if (themeFetcher.data.verified) {
        setThemeVerified(true);
        setVerificationError("");
        const name = themeFetcher.data?.themeName || "Live Theme";
        setThemeName(name);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(`reviora_theme_verified_${shop}`, "true");
            localStorage.setItem(`reviora_theme_name_${shop}`, name);
          } catch (e) {
            // ignore
          }
        }
      } else {
        setThemeVerified(false);
        setVerificationError(themeFetcher.data?.error || "Reviora Reviews app embed is not enabled yet in your theme.");
        if (typeof window !== "undefined") {
          try {
            localStorage.removeItem(`reviora_theme_verified_${shop}`);
          } catch (e) {
            // ignore
          }
        }
      }
    }
  }, [themeFetcher.data, shop]);

  // Automatic background verification for theme connection on Step 4
  useEffect(() => {
    if (currentStep !== 4) return;

    // Trigger check immediately if idle
    if (themeFetcher.state === "idle" && !themeFetcher.data) {
      themeFetcher.submit(
        { actionType: "verifyTheme" },
        { method: "POST" }
      );
    }

    // Automatically recheck when merchant returns to this tab from Shopify Theme Editor
    const handleRecheck = () => {
      if (themeFetcher.state === "idle") {
        themeFetcher.submit(
          { actionType: "verifyTheme" },
          { method: "POST" }
        );
      }
    };

    window.addEventListener("focus", handleRecheck);
    document.addEventListener("visibilitychange", handleRecheck);

    // Heartbeat auto-poll every 3 seconds while on Step 4 until verified
    let timer = null;
    if (!themeVerified) {
      timer = setInterval(() => {
        handleRecheck();
      }, 3000);
    }

    return () => {
      window.removeEventListener("focus", handleRecheck);
      document.removeEventListener("visibilitychange", handleRecheck);
      if (timer) clearInterval(timer);
    };
  }, [currentStep, themeVerified, themeFetcher.state, themeFetcher.data, themeFetcher]);



  const stepLabels = [
    "Welcome",
    "Widgets",
    "Plan",
    "Theme",
    "Launch",
  ];

  const resolvedApiKey = apiKey || "f79eb2d3832f37be2bb3a5c7c1efd416";
  const themeEditorUrl = `https://${shop}/admin/themes/${defaultThemeId}/editor?template=product&addAppBlockId=${resolvedApiKey}/review_widget&target=mainSection`;
  const appEmbedUrl = `https://${shop}/admin/themes/${defaultThemeId}/editor?context=apps&activateAppId=${resolvedApiKey}/app_embed`;

  const handleOpenThemeEditor = () => {
    if (window.shopify?.open) {
      window.shopify.open(themeEditorUrl, "_blank");
    } else {
      window.open(themeEditorUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleOpenAppEmbed = () => {
    if (window.shopify?.open) {
      window.shopify.open(appEmbedUrl, "_blank");
    } else {
      window.open(appEmbedUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleVerifyTheme = () => {
    themeFetcher.submit(
      { actionType: "verifyTheme" },
      { method: "POST" }
    );
  };

  const handleSubscribePro = () => {
    setSubscribeError("");
    billingFetcher.submit(
      { actionType: "subscribePro", isTest: isTest ? "true" : "false" },
      { method: "POST" }
    );
  };

  const handleFinish = () => {
    setIsFinishing(true);
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(`reviora_onboarding_step_${shop}`);
        localStorage.removeItem(`reviora_selected_plan_${shop}`);
        localStorage.removeItem(`reviora_selected_color_${shop}`);
        localStorage.removeItem(`reviora_theme_verified_${shop}`);
        localStorage.removeItem(`reviora_theme_name_${shop}`);
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.delete("onboarding");
        currentUrl.searchParams.delete("step");
        currentUrl.searchParams.delete("test");
        window.history.replaceState({}, "", currentUrl.pathname);
      } catch (e) {
        // 
      }
    }
    if (onComplete) {
      onComplete({
        primaryColor: selectedColor,
        plan: selectedPlan || "FREE",
      });
    }
  };

  const activeWidget = widgetsConfig.find((w) => w.id === selectedWidgetId) || widgetsConfig[0];

  return (
    <div style={{ maxWidth: "960px", margin: "0 auto", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>
      {/* ================= Stitch Connected Progress Stepper ================= */}
      <div
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: "12px",
          border: "1px solid #E1E3E5",
          padding: "20px 24px 22px 24px",
          marginBottom: "16px",
          boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
        }}
      >
        {/* Top Meta Row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "22px", flexWrap: "wrap", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                backgroundColor: "#E4F8F0",
                color: "#008060",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                border: "1px solid rgba(0, 128, 96, 0.2)",
              }}
            >
              <Sparkles size={18} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "15px", fontWeight: "600", color: "#202223" }}>
                  Storefront Setup Wizard
                </span>
                <span style={{ fontSize: "12px", color: "#6D7175" }}>•</span>
                <span style={{ fontSize: "12px", fontWeight: "500", color: "#6D7175" }}>
                  Step {currentStep} of {totalSteps}: {stepLabels[currentStep - 1]}
                </span>
              </div>
              <p style={{ fontSize: "12px", color: "#6D7175", margin: "2px 0 0 0" }}>
                Complete these 5 quick steps to configure reviews and widgets on your Shopify store.
              </p>
            </div>
          </div>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 12px",
              borderRadius: "20px",
              backgroundColor: "#E4F8F0",
              border: "1px solid #C4E7D7",
              color: "#004C3F",
              fontSize: "12px",
              fontWeight: "600",
            }}
          >
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#008060" }} />
            {currentStep === 1 ? "20%" : `${Math.round((currentStep / totalSteps) * 100)}%`} Complete
          </div>
        </div>

        {/* Connected Horizontal Stepper Track */}
        <div style={{ position: "relative", padding: "0 10px", marginTop: "8px" }}>
          {/* Base Neutral Connecting Track behind nodes */}
          <div
            style={{
              position: "absolute",
              top: "16px",
              left: "10%",
              right: "10%",
              height: "3px",
              backgroundColor: "#E1E3E5",
              borderRadius: "4px",
              zIndex: 0,
            }}
          />

          {/* Filled Progress Track */}
          <div
            style={{
              position: "absolute",
              top: "16px",
              left: "10%",
              width: `${Math.min(80, Math.max(0, ((currentStep - 1) / (totalSteps - 1)) * 80))}%`,
              height: "3px",
              backgroundColor: "#008060",
              borderRadius: "4px",
              zIndex: 0,
              transition: "width 0.3s ease",
            }}
          />

          {/* 5 Connected Step Nodes */}
          <div
            style={{
              position: "relative",
              zIndex: 1,
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              textAlign: "center",
            }}
          >
            {stepLabels.map((label, idx) => {
              const stepNum = idx + 1;
              const isCompleted = stepNum < currentStep;
              const isCurrent = stepNum === currentStep;

              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => changeStep(stepNum)}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    outline: "none",
                  }}
                >
                  {/* Node Circle */}
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "12px",
                      fontWeight: isCurrent ? "700" : "600",
                      backgroundColor: isCompleted ? "#008060" : isCurrent ? "#FFFFFF" : "#FFFFFF",
                      color: isCompleted ? "#FFFFFF" : isCurrent ? "#008060" : "#6D7175",
                      border: isCompleted ? "2px solid #008060" : isCurrent ? "2px solid #008060" : "2px solid #D2D5D8",
                      boxShadow: isCurrent ? "0 0 0 4px rgba(0, 128, 96, 0.18)" : "0 1px 2px rgba(0,0,0,0.04)",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {isCompleted ? <Check size={16} strokeWidth={2.8} /> : stepNum}
                  </div>

                  {/* Label */}
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: isCurrent ? "700" : "500",
                      color: isCurrent ? "#008060" : isCompleted ? "#202223" : "#6D7175",
                      marginTop: "8px",
                      lineHeight: 1.2,
                    }}
                  >
                    {stepNum}. {label}
                  </span>

                  {/* Status Subtitle */}
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: isCurrent ? "600" : "400",
                      color: isCompleted ? "#008060" : isCurrent ? "#008060" : "#8C9196",
                      marginTop: "2px",
                    }}
                  >
                    {isCompleted ? "Completed" : isCurrent ? "Active" : "Upcoming"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ================= Main Step Card ================= */}
      <div
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: "12px",
          border: "1px solid #E1E3E5",
          padding: "28px 32px",
          boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
        }}
      >
        {/* ========================================================
            STEP 1: Welcome & Features
        ======================================================== */}
        {currentStep === 1 && (
          <div>
            <div style={{ marginBottom: "24px" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", backgroundColor: "#F1F8F5", color: "#008060", padding: "4px 8px", borderRadius: "6px", fontSize: "12px", fontWeight: "600", marginBottom: "8px" }}>
                <Sparkles size={14} /> Built for Shopify Online Store 2.0
              </div>
              <h2 style={{ fontSize: "20px", fontWeight: "600", color: "#202223", margin: "0 0 6px 0" }}>
                Welcome to Reviora Reviews
              </h2>
              <p style={{ fontSize: "14px", color: "#6D7175", margin: 0, lineHeight: 1.5 }}>
                Collect customer social proof, display fast-loading review widgets, and drive higher store conversion with zero liquid coding.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "28px" }}>
              {/* Feature 1 */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", padding: "12px", borderRadius: "8px", border: "1px solid #F1F2F4", backgroundColor: "#FAFAFA" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "8px", backgroundColor: "#FFFFFF", border: "1px solid #E1E3E5", display: "flex", alignItems: "center", justifyContent: "center", color: "#008060", flexShrink: 0 }}>
                  <Camera size={18} />
                </div>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: "#202223", marginBottom: "2px" }}>
                    Photo &amp; Video Reviews
                  </div>
                  <div style={{ fontSize: "13px", color: "#6D7175", lineHeight: 1.4 }}>
                    Let buyers upload photos and short video clips directly from their phones with automatic image compression.
                  </div>
                </div>
              </div>

              {/* Feature 2 */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", padding: "12px", borderRadius: "8px", border: "1px solid #F1F2F4", backgroundColor: "#FAFAFA" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "8px", backgroundColor: "#FFFFFF", border: "1px solid #E1E3E5", display: "flex", alignItems: "center", justifyContent: "center", color: "#008060", flexShrink: 0 }}>
                  <LayoutGrid size={18} />
                </div>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: "#202223", marginBottom: "2px" }}>
                    11 Storefront Theme Widgets
                  </div>
                  <div style={{ fontSize: "13px", color: "#6D7175", lineHeight: 1.4 }}>
                    Star rating badges, product review lists, customer quote carousels, and floating verified badges.
                  </div>
                </div>
              </div>


              {/* Feature 4 */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", padding: "12px", borderRadius: "8px", border: "1px solid #F1F2F4", backgroundColor: "#FAFAFA" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "8px", backgroundColor: "#FFFFFF", border: "1px solid #E1E3E5", display: "flex", alignItems: "center", justifyContent: "center", color: "#008060", flexShrink: 0 }}>
                  <Download size={18} />
                </div>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: "#202223", marginBottom: "2px" }}>
                    1-Click Import from CSV &amp; Competitors
                  </div>
                  <div style={{ fontSize: "13px", color: "#6D7175", lineHeight: 1.4 }}>
                    Effortlessly transfer your existing review history from Judge.me, Loox, Yotpo, AliExpress, or CSV files.
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: "16px", borderTop: "1px solid #F1F2F4" }}>
              <button
                type="button"
                onClick={() => changeStep(2)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "9px 18px",
                  backgroundColor: "#008060",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Next: View All Widgets <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            STEP 2: Showcase All 11 Storefront Widgets as Chips (Stitch Design)
        ======================================================== */}
        {currentStep === 2 && (
          <div>
            <div style={{ marginBottom: "20px" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", backgroundColor: "#E4F8F0", color: "#004C3F", padding: "4px 8px", borderRadius: "6px", fontSize: "12px", fontWeight: "600", marginBottom: "8px" }}>
                <Layers size={14} /> 11 Storefront Theme App Blocks
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "8px" }}>
                <h2 style={{ fontSize: "20px", fontWeight: "600", color: "#202223", margin: "0 0 6px 0" }}>
                  Explore All Reviora Widgets
                </h2>
              </div>
              <p style={{ fontSize: "14px", color: "#6D7175", margin: 0, lineHeight: 1.5 }}>
                Discover and preview app embed blocks available to insert into your Shopify Online Store 2.0 theme without writing code. Click any chip below:
              </p>
            </div>

            {/* Interactive Chips Bar */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "8px",
                marginBottom: "20px",
              }}
            >
              {widgetsConfig.map((widget) => {
                const isSelected = selectedWidgetId === widget.id;
                return (
                  <button
                    key={widget.id}
                    type="button"
                    onClick={() => setSelectedWidgetId(widget.id)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "7px 13px",
                      borderRadius: "20px",
                      border: isSelected ? "2px solid #008060" : "1px solid #D2D5D8",
                      backgroundColor: isSelected ? "#E4F8F0" : "#FFFFFF",
                      color: isSelected ? "#004C3F" : "#202223",
                      fontSize: "12px",
                      fontWeight: isSelected ? "600" : "500",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      boxShadow: isSelected ? "0 1px 4px rgba(0, 128, 96, 0.15)" : "0 1px 2px rgba(0,0,0,0.03)",
                    }}
                  >
                    <span style={{ fontSize: "14px", lineHeight: 1 }}>{widget.preview?.icon || "✨"}</span>
                    <span>{widget.title}</span>
                    {isSelected && (
                      <Check size={12} color="#008060" strokeWidth={3} />
                    )}
                    {widget.isPremium && (
                      <span
                        style={{
                          fontSize: "9px",
                          fontWeight: "700",
                          color: "#C2410C",
                          backgroundColor: "#FFF7ED",
                          border: "1px solid #FFEDD5",
                          padding: "1px 5px",
                          borderRadius: "4px",
                          lineHeight: 1.2,
                        }}
                      >
                        PRO
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Dual-Column Bento Spotlight Preview Card */}
            {activeWidget && (
              <div
                style={{
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #E1E3E5",
                  borderRadius: "10px",
                  overflow: "hidden",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
                  marginBottom: "20px",
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                }}
              >
                {/* Left Column: Live Storefront Graphic Simulation */}
                <div
                  style={{
                    padding: "18px 20px",
                    backgroundColor: "#FAFBFB",
                    borderRight: "1px solid #E1E3E5",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    {/* Simulated Browser URL Bar */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        paddingBottom: "10px",
                        borderBottom: "1px solid #E5E7EB",
                        marginBottom: "14px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#EF4444" }} />
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#F59E0B" }} />
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#10B981" }} />
                        <span style={{ fontSize: "11px", color: "#6B7280", fontFamily: "monospace", marginLeft: "6px" }}>
                          store.myshopify.com/{activeWidget.template === "product" ? "products/example" : activeWidget.template === "page" ? "pages/reviews" : ""}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: "600",
                          color: "#004C3F",
                          backgroundColor: "#E4F8F0",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px",
                        }}
                      >
                        <Eye size={11} /> Live Simulation
                      </span>
                    </div>

                    {/* Live Graphic Mockup Rendering */}
                    <div
                      style={{
                        minHeight: "130px",
                        borderRadius: "8px",
                        background: activeWidget.preview?.gradient || "#F3F4F6",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "14px",
                        overflow: "hidden",
                        boxShadow: "inset 0 1px 3px rgba(0,0,0,0.06)",
                      }}
                    >
                      {activeWidget.preview?.render ? (
                        activeWidget.preview.render()
                      ) : (
                        <div style={{ fontSize: "36px" }}>{activeWidget.preview?.icon || "✨"}</div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", color: "#8C9196", paddingTop: "12px" }}>
                    <span>🎨 Auto-inherits store typography &amp; colors</span>
                    <span style={{ fontFamily: "monospace" }}>ID: {activeWidget.id}</span>
                  </div>
                </div>

                {/* Right Column: Detailed Widget Specs */}
                <div
                  style={{
                    padding: "20px 22px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    {/* Badge Cluster */}
                    <div style={{ display: "flex", gap: "6px", alignItems: "center", marginBottom: "8px" }}>
                      {activeWidget.isPremium ? (
                        <span style={{ fontSize: "10px", fontWeight: "700", color: "#C2410C", backgroundColor: "#FFF7ED", border: "1px solid #FFEDD5", padding: "2px 7px", borderRadius: "4px" }}>
                          PRO Tier Feature
                        </span>
                      ) : (
                        <span style={{ fontSize: "10px", fontWeight: "600", color: "#004C3F", backgroundColor: "#E4F8F0", padding: "2px 7px", borderRadius: "4px" }}>
                          Included in All Plans (Free)
                        </span>
                      )}
                      <span style={{ fontSize: "10px", fontWeight: "500", color: "#475569", backgroundColor: "#F1F5F9", padding: "2px 7px", borderRadius: "4px" }}>
                        OS 2.0 Block
                      </span>
                    </div>

                    <h3 style={{ fontSize: "17px", fontWeight: "600", color: "#202223", margin: "0 0 6px 0" }}>
                      {activeWidget.title}
                    </h3>

                    <p style={{ fontSize: "13px", color: "#6D7175", lineHeight: 1.45, margin: "0 0 14px 0" }}>
                      {activeWidget.description}
                    </p>

                    {/* Placement Box */}
                    <div style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "10px 12px", marginBottom: "14px" }}>
                      <div style={{ fontSize: "12px", color: "#202223", fontWeight: "600", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                        <span>📍 Placement:</span>
                        <span style={{ fontWeight: "500", color: "#475569" }}>
                          {activeWidget.template === "product"
                            ? "Product Detail Page Block"
                            : activeWidget.template === "page"
                              ? "Dedicated Review Center (/pages/reviews)"
                              : "Homepage & Collection Section"}
                        </span>
                      </div>
                      <div style={{ fontSize: "11px", color: "#008060", fontWeight: "600", display: "flex", alignItems: "center", gap: "4px" }}>
                        <CheckCircle2 size={13} /> Shopify App Block Ready (Drag &amp; Drop)
                      </div>
                    </div>

                    {/* Capabilities Checklist */}
                    <div style={{ fontSize: "12px", color: "#475569", display: "flex", flexDirection: "column", gap: "6px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Check size={13} color="#008060" strokeWidth={2.5} />
                        <span><strong>Zero Liquid code required:</strong> Turn on or reposition in theme editor.</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Check size={13} color="#008060" strokeWidth={2.5} />
                        <span><strong>Performance optimized:</strong> Built with instant asynchronous loading.</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Zero Liquid Code Alert Banner */}
            <div
              style={{
                backgroundColor: "#F1F8F5",
                border: "1px solid #C4E7D7",
                borderRadius: "10px",
                padding: "12px 16px",
                marginBottom: "20px",
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
              }}
            >
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  backgroundColor: "#E4F8F0",
                  color: "#008060",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: "2px",
                }}
              >
                <Code2 size={16} />
              </div>
              <div style={{ fontSize: "12px", color: "#202223", lineHeight: 1.5 }}>
                <strong style={{ color: "#004C3F" }}>Zero Liquid Code Architecture:</strong>
                {" "}Add and customize any of these widgets directly from your Shopify Theme Editor via <strong>Theme App Extensions (OS 2.0)</strong>. No template file edits, no theme clutter, and zero speed impact.
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "16px", borderTop: "1px solid #F1F2F4" }}>
              <button
                type="button"
                onClick={() => changeStep(1)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "9px 16px",
                  backgroundColor: "#FFFFFF",
                  color: "#202223",
                  border: "1px solid #C9CCCF",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: "500",
                  cursor: "pointer",
                }}
              >
                <ArrowLeft size={14} /> Back
              </button>
              <button
                type="button"
                onClick={() => changeStep(3)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "9px 18px",
                  backgroundColor: "#008060",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Next: Choose Plan <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            STEP 3: Plan Selection
        ======================================================== */}
        {currentStep === 3 && (
          <div>
            <div style={{ marginBottom: "24px" }}>
              <h2 style={{ fontSize: "20px", fontWeight: "600", color: "#202223", margin: "0 0 6px 0" }}>
                Choose Your Plan
              </h2>
              <p style={{ fontSize: "14px", color: "#6D7175", margin: 0, lineHeight: 1.5 }}>
                Start free forever or unlock photo reviews, AI auto-replies, and video reels with Reviora Pro.
              </p>
            </div>

            {(() => {
              const activeChoice = selectedPlan || (hasActivePayment ? "PRO" : "FREE");
              const isFreeSelected = activeChoice === "FREE";
              const isProSelected = !isFreeSelected;

              return (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
                  {/* Free Plan */}
                  <div
                    style={{
                      padding: "20px",
                      borderRadius: "10px",
                      border: isFreeSelected ? "2px solid #008060" : "1px solid #E1E3E5",
                      backgroundColor: isFreeSelected ? "#F9FCFB" : "#FFFFFF",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <div style={{ fontSize: "15px", fontWeight: "600", color: "#202223" }}>Free</div>
                        {isFreeSelected ? (
                          <span style={{ fontSize: "11px", fontWeight: "600", color: "#008060", backgroundColor: "#E4F8F0", padding: "2px 6px", borderRadius: "4px", display: "inline-flex", alignItems: "center", gap: "3px" }}>
                            <Check size={11} strokeWidth={3} /> Active Plan
                          </span>
                        ) : null}
                      </div>

                      <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginBottom: "8px" }}>
                        <span style={{ fontSize: "24px", fontWeight: "700", color: "#202223" }}>$0</span>
                        <span style={{ fontSize: "12px", color: "#6D7175" }}>/ forever</span>
                      </div>

                      <div style={{ fontSize: "12px", color: "#6D7175", marginBottom: "14px", lineHeight: 1.4 }}>
                        Ideal for new stores starting to collect authentic buyer reviews.
                      </div>

                      <div style={{ height: "1px", backgroundColor: "#F1F2F4", marginBottom: "14px" }} />

                      <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12px", color: "#202223" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Check size={13} color="#008060" /> 8 Essential review widgets
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Check size={13} color="#008060" /> Storefront review form
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Check size={13} color="#008060" /> Moderation inbox (Approve/Reject)
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Check size={13} color="#008060" /> 1-Click CSV &amp; App import
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSelectPlan("FREE")}
                      style={{
                        marginTop: "18px",
                        width: "100%",
                        padding: "8px",
                        borderRadius: "6px",
                        border: isFreeSelected ? "1px solid #008060" : "1px solid #C9CCCF",
                        backgroundColor: isFreeSelected ? "#008060" : "#FFFFFF",
                        color: isFreeSelected ? "#FFFFFF" : "#202223",
                        fontSize: "12px",
                        fontWeight: "600",
                        cursor: isFreeSelected ? "default" : "pointer",
                      }}
                    >
                      {isFreeSelected ? "✓ Active (Free Plan)" : "Switch to Free Plan"}
                    </button>
                  </div>

                  {/* Pro Plan */}
                  <div
                    style={{
                      padding: "20px",
                      borderRadius: "10px",
                      border: isProSelected ? "2px solid #008060" : "1px solid #E1E3E5",
                      backgroundColor: isProSelected ? "#F9FCFB" : "#FFFFFF",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      transition: "all 0.15s ease",
                      position: "relative",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <div style={{ fontSize: "15px", fontWeight: "600", color: "#202223" }}>Pro</div>
                        {isProSelected ? (
                          <span style={{ fontSize: "11px", fontWeight: "600", color: "#008060", backgroundColor: "#E4F8F0", padding: "2px 6px", borderRadius: "4px", display: "inline-flex", alignItems: "center", gap: "3px" }}>
                            <Check size={11} strokeWidth={3} /> Active Plan
                          </span>
                        ) : (
                          <span style={{ fontSize: "11px", fontWeight: "600", color: "#008060", backgroundColor: "#E4F8F0", padding: "2px 6px", borderRadius: "4px" }}>
                            Recommended
                          </span>
                        )}
                      </div>

                      <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginBottom: "8px" }}>
                        <span style={{ fontSize: "24px", fontWeight: "700", color: "#008060" }}>$4.99</span>
                        <span style={{ fontSize: "12px", color: "#6D7175" }}>/ month</span>
                      </div>

                      <div style={{ fontSize: "12px", color: "#6D7175", marginBottom: "14px", lineHeight: 1.4 }}>
                        Accelerate conversions with photo uploads, AI tools, and carousels.
                      </div>

                      <div style={{ height: "1px", backgroundColor: "#F1F2F4", marginBottom: "14px" }} />

                      <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12px", color: "#202223" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Check size={13} color="#008060" /> <strong>Everything in Free</strong>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Check size={13} color="#008060" /> Photo &amp; video customer uploads
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Check size={13} color="#008060" /> AI auto-replies &amp; sentiment analysis
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Check size={13} color="#008060" /> Automated review request emails
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Check size={13} color="#008060" /> Video Reels &amp; Review Carousels
                        </div>
                      </div>
                    </div>

                    <div>
                      {isProSelected ? (
                        <button
                          type="button"
                          style={{
                            marginTop: "18px",
                            width: "100%",
                            padding: "8px",
                            borderRadius: "6px",
                            border: "none",
                            backgroundColor: "#008060",
                            color: "#FFFFFF",
                            fontSize: "12px",
                            fontWeight: "600",
                            cursor: "default",
                          }}
                        >
                          ✓ Active (Pro Plan)
                        </button>
                      ) : hasActivePayment ? (
                        <button
                          type="button"
                          onClick={() => handleSelectPlan("PRO")}
                          style={{
                            marginTop: "18px",
                            width: "100%",
                            padding: "8px",
                            borderRadius: "6px",
                            border: "none",
                            backgroundColor: "#202223",
                            color: "#FFFFFF",
                            fontSize: "12px",
                            fontWeight: "600",
                            cursor: "pointer",
                          }}
                        >
                          Switch to Pro Plan
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isSubscribingPro}
                          onClick={handleSubscribePro}
                          style={{
                            marginTop: "18px",
                            width: "100%",
                            padding: "8px",
                            borderRadius: "6px",
                            border: "none",
                            backgroundColor: "#202223",
                            color: "#FFFFFF",
                            fontSize: "12px",
                            fontWeight: "600",
                            cursor: isSubscribingPro ? "wait" : "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "6px",
                          }}
                        >
                          {isSubscribingPro ? (
                            <>
                              <RefreshCw size={13} className="animate-spin" /> Preparing Shopify Checkout...
                            </>
                          ) : (
                            <>
                              Subscribe to Pro ($4.99/mo) <ExternalLink size={13} />
                            </>
                          )}
                        </button>
                      )}
                      {subscribeError && (
                        <div style={{ marginTop: "10px", padding: "8px 10px", backgroundColor: "#FFF4F4", border: "1px solid #FED2D2", borderRadius: "6px", textAlign: "center" }}>
                          <div style={{ color: "#D72C0D", fontSize: "11px", fontWeight: "500", marginBottom: "4px" }}>
                            {subscribeError}
                          </div>
                          <a
                            href="/app/billing"
                            target="_top"
                            style={{ color: "#008060", fontSize: "11px", fontWeight: "600", textDecoration: "underline" }}
                          >
                            Open Billing Page directly →
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "16px", borderTop: "1px solid #F1F2F4" }}>
              <button
                type="button"
                onClick={() => changeStep(2)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "9px 16px",
                  backgroundColor: "#FFFFFF",
                  color: "#202223",
                  border: "1px solid #C9CCCF",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: "500",
                  cursor: "pointer",
                }}
              >
                <ArrowLeft size={14} /> Back
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {!selectedPlan && (
                  <span style={{ fontSize: "12px", color: "#8C9196" }}>
                    Activate a plan above to continue
                  </span>
                )}
                <button
                  type="button"
                  disabled={!selectedPlan}
                  onClick={() => changeStep(4)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "9px 18px",
                    backgroundColor: selectedPlan ? "#008060" : "#E4E5E7",
                    color: selectedPlan ? "#FFFFFF" : "#8C9196",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: selectedPlan ? "pointer" : "not-allowed",
                    transition: "all 0.15s ease",
                  }}
                >
                  Next: Enable in Theme <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            STEP 4: Theme Enable with Verification
        ======================================================== */}
        {currentStep === 4 && (
          <div>
            <div style={{ marginBottom: "24px" }}>
              <h2 style={{ fontSize: "20px", fontWeight: "600", color: "#202223", margin: "0 0 6px 0" }}>
                Enable in Your Shopify Theme
              </h2>
              <p style={{ fontSize: "14px", color: "#6D7175", margin: 0, lineHeight: 1.5 }}>
                Connect Reviora to your live theme. No manual liquid coding or theme editing required.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "28px" }}>
              {/* Linear Step 1 */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
                <div style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "#F1F2F4", color: "#202223", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "700", flexShrink: 0, marginTop: "2px" }}>
                  1
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: "#202223", marginBottom: "2px" }}>
                    Enable Reviora in App Embeds (Recommended)
                  </div>
                  <div style={{ fontSize: "13px", color: "#6D7175", marginBottom: "10px", lineHeight: 1.4 }}>
                    Turn on the <strong>Reviora Reviews</strong> app embed to activate core scripts across your store, or add the widget block to your product page.
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={handleOpenAppEmbed}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "8px 14px",
                        backgroundColor: "#008060",
                        color: "#FFFFFF",
                        border: "none",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                    >
                      Enable App Embed <ExternalLink size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenThemeEditor}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "8px 14px",
                        backgroundColor: "#FFFFFF",
                        color: "#202223",
                        border: "1px solid #C9CCCF",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                    >
                      Add Product Widget Block <ExternalLink size={13} />
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ height: "1px", backgroundColor: "#F1F2F4", margin: "0 0 0 38px" }} />

              {/* Linear Step 2 */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
                <div style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "#F1F2F4", color: "#202223", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "700", flexShrink: 0, marginTop: "2px" }}>
                  2
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: "#202223", marginBottom: "2px" }}>
                    Click &ldquo;Save&rdquo; in Theme Editor
                  </div>
                  <div style={{ fontSize: "13px", color: "#6D7175", lineHeight: 1.4 }}>
                    In the top-right corner of the Shopify Theme Editor, click the green <strong>Save</strong> button to commit the widget.
                  </div>
                </div>
              </div>

              <div style={{ height: "1px", backgroundColor: "#F1F2F4", margin: "0 0 0 38px" }} />

              {/* Linear Step 3 */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
                <div
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    backgroundColor: themeVerified ? "#008060" : "#F1F2F4",
                    color: themeVerified ? "#FFFFFF" : "#202223",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    fontWeight: "700",
                    flexShrink: 0,
                    marginTop: "2px",
                  }}
                >
                  {themeVerified ? <Check size={13} strokeWidth={3} /> : "3"}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: "#202223", marginBottom: "2px" }}>
                    Verify Theme Connection
                  </div>
                  <div style={{ fontSize: "13px", color: themeVerified ? "#008060" : "#6D7175", marginBottom: "12px", lineHeight: 1.4 }}>
                    {themeVerified
                      ? "✓ Reviora Reviews app embed is enabled and verified in your theme. You can proceed to complete setup."
                      : "The Reviora Reviews app embed must be enabled in your theme editor before you can continue."}
                  </div>
                  {!themeVerified && verificationError && (
                    <div style={{ padding: "8px 12px", backgroundColor: "#FFF4F2", border: "1px solid #FED3D1", borderRadius: "6px", color: "#D72C0D", fontSize: "12px", marginBottom: "12px" }}>
                      ⚠️ {verificationError}
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      disabled={isVerifying || themeVerified}
                      onClick={handleVerifyTheme}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "8px 16px",
                        backgroundColor: themeVerified ? "#F4FBF7" : "#008060",
                        color: themeVerified ? "#008060" : "#FFFFFF",
                        border: themeVerified ? "1px solid #A4E8CE" : "none",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: "600",
                        cursor: themeVerified ? "default" : "pointer",
                      }}
                    >
                      {isVerifying ? (
                        <>
                          <RefreshCw size={13} className="animate-spin" /> Checking in background...
                        </>
                      ) : themeVerified ? (
                        <>
                          <Check size={13} strokeWidth={3} /> Verified ({themeName || "Live Theme"})
                        </>
                      ) : (
                        <>
                          <RefreshCw size={13} /> Check Connection Now
                        </>
                      )}
                    </button>
                    {!themeVerified && (
                      <span style={{ fontSize: "12px", color: "#6D7175", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        <span
                          style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            backgroundColor: "#008060",
                            boxShadow: "0 0 0 2px rgba(0, 128, 96, 0.2)",
                          }}
                        />
                        Auto-checking in background...
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "16px", borderTop: "1px solid #F1F2F4" }}>
              <button
                type="button"
                onClick={() => changeStep(3)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "9px 16px",
                  backgroundColor: "#FFFFFF",
                  color: "#202223",
                  border: "1px solid #C9CCCF",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: "500",
                  cursor: "pointer",
                }}
              >
                <ArrowLeft size={14} /> Back
              </button>
              <button
                type="button"
                disabled={!themeVerified}
                onClick={() => changeStep(5)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "9px 18px",
                  backgroundColor: themeVerified ? "#008060" : "#E4E5E7",
                  color: themeVerified ? "#FFFFFF" : "#8C9196",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: themeVerified ? "pointer" : "not-allowed",
                }}
              >
                Next: Complete Setup <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            STEP 5: Setup Complete
        ======================================================== */}
        {currentStep === 5 && (
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                backgroundColor: "#E4F8F0",
                color: "#008060",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "16px",
              }}
            >
              <ShieldCheck size={28} />
            </div>

            <h2 style={{ fontSize: "20px", fontWeight: "600", color: "#202223", margin: "0 0 6px 0" }}>
              You&apos;re All Set!
            </h2>
            <p style={{ fontSize: "14px", color: "#6D7175", margin: "0 0 24px 0", lineHeight: 1.5 }}>
              Reviora is connected to your live theme and configured according to your preferences.
            </p>

            {/* Summary Box */}
            <div
              style={{
                textAlign: "left",
                padding: "16px 20px",
                borderRadius: "8px",
                border: "1px solid #E1E3E5",
                backgroundColor: "#FAFAFA",
                marginBottom: "28px",
              }}
            >
              <div style={{ fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.04em", color: "#6D7175", marginBottom: "12px" }}>
                Configuration Summary
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#6D7175" }}>Shopify Store</span>
                  <span style={{ fontWeight: "600", color: "#202223" }}>{shop}</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#6D7175" }}>Theme Widgets</span>
                  <span style={{ fontWeight: "600", color: "#008060" }}>11 Available &amp; Ready</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#6D7175" }}>Chosen Tier</span>
                  <span style={{ fontWeight: "600", color: "#202223" }}>
                    {selectedPlan === "PRO" ? "Pro Plan ($4.99/mo)" : "Free Plan ($0/mo)"}
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#6D7175" }}>Theme Integration</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#008060", fontWeight: "600" }}>
                    <Check size={13} strokeWidth={3} /> Verified &amp; Active
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={isFinishing}
              onClick={handleFinish}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "11px 28px",
                backgroundColor: isFinishing ? "#4B5563" : "#008060",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: isFinishing ? "wait" : "pointer",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              }}
            >
              {isFinishing ? (
                <>
                  <RefreshCw size={15} className="animate-spin" /> Loading Dashboard...
                </>
              ) : (
                "Go to Dashboard"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
