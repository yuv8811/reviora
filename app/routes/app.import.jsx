import { useState, useEffect } from "react";
import { useActionData, useNavigation, useSubmit, useFetcher, useNavigate } from "react-router";
import { authenticate } from "../shopify.server.js";
import { createReview, exportReviewsToCsv, verifyCustomerByEmail } from "../models/review.server.js";

function CsvDropArea({ fileName, rowCount, onFileSelected, onClearFile, hint }) {
  const [isDragOver, setIsDragOver] = useState(false);

  if (fileName) {
    return (
      <s-box padding="base" background="subdued" borderRadius="base">
        <s-stack direction="inline" justifyContent="space-between" alignItems="center">
          <s-stack direction="inline" gap="small" alignItems="center">
            <s-badge tone="success">File Loaded</s-badge>
            <s-text weight="semibold">{fileName}</s-text>
            <s-text tone="subdued" size="small">({rowCount} review{rowCount === 1 ? "" : "s"} detected)</s-text>
          </s-stack>
          <s-button variant="tertiary" tone="critical" onClick={onClearFile}>Remove</s-button>
        </s-stack>
      </s-box>
    );
  }

  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        if (e.dataTransfer.files?.[0]) {
          onFileSelected(e.dataTransfer.files[0]);
        }
      }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
        border: isDragOver ? "2px dashed #005BD3" : "2px dashed #D2D5D8",
        borderRadius: "8px",
        backgroundColor: isDragOver ? "#F0F7FF" : "#FAFAFA",
        cursor: "pointer",
        transition: "all 0.15s ease",
        textAlign: "center",
      }}
    >
      <input
        type="file"
        accept=".csv,text/csv,text/plain"
        style={{ display: "none" }}
        onChange={(e) => {
          if (e.target.files?.[0]) {
            onFileSelected(e.target.files[0]);
          }
        }}
      />
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6D7175" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: "8px" }}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
      <s-text weight="semibold">Drop CSV file to upload</s-text>
      <s-text tone="subdued" size="small" style={{ marginTop: "4px" }}>
        {hint || "or click to browse your computer"}
      </s-text>
    </label>
  );
}

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);

  if (url.searchParams.get("export") === "true") {
    const csvData = await exportReviewsToCsv(session.shop);
    return new Response(csvData, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="reviora_reviews_${session.shop}_export.csv"`,
      },
    });
  }

  return null;
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "export") {
    try {
      const csvData = await exportReviewsToCsv(session.shop);
      const safeShop = (session.shop || "store").replace(/[^a-z0-9]/gi, "_");
      return {
        exportSuccess: true,
        csvData,
        filename: `reviora_reviews_${safeShop}_export.csv`,
      };
    } catch (err) {
      console.error("Export reviews error:", err);
      return { exportError: "Failed to generate CSV export. Please try again." };
    }
  }

  const authorized = formData.get("authorized");
  if (authorized !== "true") {
    return { error: "You must confirm that you have proper authorization and ownership to import these reviews." };
  }

  const rawCsv = formData.get("rawCsv");

  if (!rawCsv || !rawCsv.trim()) {
    return { error: "Please drop or select a CSV file, or paste CSV data." };
  }

  const lines = rawCsv.trim().split("\n");
  if (lines.length < 2) {
    return { error: "CSV must contain a header row and at least one data row." };
  }

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/["']/g, ""));
  let importedCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = line.split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""));

    let rating = 5;
    let title = "";
    let body = "";
    let authorName = "Customer";
    let authorEmail = "customer@example.com";
    let productHandle = "the-complete-snowboard";
    let verified = false;
    let explicitlyVerified = false;

    headers.forEach((h, idx) => {
      const val = cols[idx] || "";
      if (h.includes("rating") || h.includes("stars") || h.includes("score")) {
        rating = parseInt(val) || 5;
      } else if (h.includes("title") || h.includes("headline") || h.includes("subject")) {
        title = val;
      } else if (
        h.includes("body") ||
        h.includes("review") ||
        h.includes("content") ||
        h.includes("feedback") ||
        h.includes("text")
      ) {
        body = val;
      } else if (
        h.includes("name") ||
        h.includes("author") ||
        h.includes("reviewer") ||
        h.includes("user")
      ) {
        authorName = val;
      } else if (h.includes("email")) {
        authorEmail = val;
      } else if (
        h.includes("product") ||
        h.includes("handle") ||
        h.includes("item") ||
        h.includes("sku")
      ) {
        productHandle = val;
      } else if (h.includes("verified")) {
        verified = val.toLowerCase() === "true" || val === "1" || val.toLowerCase() === "yes";
        explicitlyVerified = true;
      }
    });

    if (!explicitlyVerified && authorEmail) {
      verified = await verifyCustomerByEmail(session.shop, authorEmail);
    }

    if (body) {
      await createReview({
        shop: session.shop,
        productId: productHandle,
        productHandle,
        productTitle: productHandle,
        rating,
        title,
        body,
        authorName,
        authorEmail,
        verified,
      });
      importedCount++;
    }
  }

  return { success: true, count: importedCount };
};

// Available review apps matching Judge.me list
const REVIEW_APPS_LIST = [
  {
    id: "judge_me",
    name: "Judge.me",
    bgColor: "#0D3349",
    color: "#38BDF8",
    logoText: "J.me",
  },
  {
    id: "loox",
    name: "Loox",
    bgColor: "#000000",
    color: "#FFFFFF",
    logoText: "LOOX",
  },
  {
    id: "yotpo",
    name: "Yotpo",
    bgColor: "#0D57F8",
    color: "#FFFFFF",
    logoText: "yotpo.",
  },
  {
    id: "okendo",
    name: "Okendo",
    bgColor: "#000000",
    color: "#FFFFFF",
    logoText: "OKENDO",
  },
  {
    id: "klaviyo",
    name: "Klaviyo Reviews",
    bgColor: "#1F2937",
    color: "#F43F5E",
    logoText: "⚑",
  },
  {
    id: "shopify",
    name: "Shopify Product Reviews",
    bgColor: "#1C2024",
    color: "#95BF47",
    logoText: "🛍️",
  },
  {
    id: "trustoo",
    name: "Trustoo.io",
    bgColor: "#E02B20",
    color: "#FFFFFF",
    logoText: "T.",
  },
];

function ComplianceBanner() {
  return (
    <div
      style={{
        padding: "14px 16px",
        backgroundColor: "#F0FDF4",
        border: "1px solid #BBF7D0",
        borderRadius: "8px",
        marginBottom: "16px",
      }}
    >
      <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
        <span style={{ color: "#16A34A", fontSize: "16px", lineHeight: "1.2" }}>🛡️</span>
        <div style={{ fontSize: "13px", color: "#166534", lineHeight: "1.4" }}>
          <strong>Duplicate only authorized product information:</strong> In compliance with Shopify App Store policy, Reviora only imports reviews that you own or have explicit authorization to use for products you sell. Importing customer reviews from competitors or unauthorized third-party sources is strictly prohibited.
        </div>
      </div>
    </div>
  );
}

function AuthorizationCheckbox({ checked, onChange, label }) {
  return (
    <div
      style={{
        padding: "12px 14px",
        backgroundColor: checked ? "#F0FDF4" : "#F9FAFB",
        border: checked ? "1px solid #86EFAC" : "1px solid #D2D5D8",
        borderRadius: "8px",
        transition: "all 0.15s ease",
      }}
    >
      <label
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "10px",
          cursor: "pointer",
          fontSize: "13px",
          color: "#202223",
          userSelect: "none",
        }}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          style={{
            marginTop: "2px",
            width: "16px",
            height: "16px",
            accentColor: "#008060",
            cursor: "pointer",
            flexShrink: 0,
          }}
        />
        <span style={{ lineHeight: 1.4 }}>
          {label ||
            "I confirm that I own these reviews or have proper authorization from the rights holder to import and display them on my store."}
        </span>
      </label>
    </div>
  );
}

function AppBrandIcon({ appId, size = 34 }) {
  if (appId === "judge_me") {
    return (
      <img
        src="/review_request/judgeme.png"
        alt="Judge.me"
        style={{
          width: size,
          height: size,
          objectFit: "contain",
          borderRadius: "6px",
          display: "block",
          flexShrink: 0,
          boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
        }}
      />
    );
  }

  if (appId === "loox") {
    return (
      <img
        src="/review_request/loox.png"
        alt="Loox"
        style={{
          width: size,
          height: size,
          objectFit: "contain",
          borderRadius: "6px",
          display: "block",
          flexShrink: 0,
          boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
        }}
      />
    );
  }

  if (appId === "yotpo") {
    return (
      <img
        src="/review_request/yotpo.png"
        alt="Yotpo"
        style={{
          width: size,
          height: size,
          objectFit: "contain",
          borderRadius: "6px",
          display: "block",
          flexShrink: 0,
          boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
        }}
      />
    );
  }

  if (appId === "okendo") {
    return (
      <img
        src="/review_request/okendo.png"
        alt="Yotpo"
        style={{
          width: size,
          height: size,
          objectFit: "contain",
          borderRadius: "6px",
          display: "block",
          flexShrink: 0,
          boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
        }}
      />
    );
  }

  if (appId === "klaviyo") {
    return (
      <img
        src="/review_request/klaviyo.png"
        alt="Yotpo"
        style={{
          width: size,
          height: size,
          objectFit: "contain",
          borderRadius: "6px",
          display: "block",
          flexShrink: 0,
          boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
        }}
      />
    );
  }

  if (appId === "shopify") {
    return (
      <img
        src="/review_request/shopify.png"
        alt="Yotpo"
        style={{
          width: size,
          height: size,
          objectFit: "contain",
          borderRadius: "6px",
          display: "block",
          flexShrink: 0,
          boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
        }}
      />
    );
  }

  if (appId === "trustoo") {
    return (
      <img
        src="/review_request/trustoo.png"
        alt="Yotpo"
        style={{
          width: size,
          height: size,
          objectFit: "contain",
          borderRadius: "6px",
          display: "block",
          flexShrink: 0,
          boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 6,
        background: "#F1F5F9",
        border: "1px solid #E2E8F0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      ⭐
    </div>
  );
}

export default function ImportPage() {
  const actionData = useActionData();
  const navigation = useNavigation();
  const submit = useSubmit();
  const exportFetcher = useFetcher();
  const navigate = useNavigate();

  const isImporting = navigation.state === "submitting";
  const isExporting = exportFetcher.state !== "idle";

  // Navigation view: null (main choices) | "apps" | "spreadsheet" | "store"
  const [currentView, setCurrentView] = useState(null);

  // App search query
  const [searchAppQuery, setSearchAppQuery] = useState("");

  // Currently selected item for upload in subview
  const [selectedItem, setSelectedItem] = useState(null);

  const [csvContent, setCsvContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [rowCount, setRowCount] = useState(0);
  const [showRawEditor, setShowRawEditor] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Auto-clear when import completes
  useEffect(() => {
    if (actionData?.success) {
      setSelectedItem(null);
      setCsvContent("");
      setFileName("");
      setRowCount(0);
      setIsAuthorized(false);
    }
  }, [actionData]);

  // Trigger client-side file download when export completes
  useEffect(() => {
    if (exportFetcher.data?.exportSuccess && exportFetcher.data?.csvData) {
      const blob = new Blob([exportFetcher.data.csvData], {
        type: "text/csv;charset=utf-8;",
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", exportFetcher.data.filename || "reviews_export.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    }
  }, [exportFetcher.data]);

  const handleExport = () => {
    exportFetcher.submit({ intent: "export" }, { method: "POST" });
  };

  const handleNavigateTo = (view) => {
    setCurrentView(view);
    setSearchAppQuery("");
    setSelectedItem(null);
    setCsvContent("");
    setFileName("");
    setRowCount(0);
    setShowRawEditor(false);
    setIsAuthorized(false);
  };

  const handleBackToMain = () => {
    setCurrentView(null);
    setSearchAppQuery("");
    setSelectedItem(null);
    setCsvContent("");
    setFileName("");
    setRowCount(0);
    setIsAuthorized(false);
  };

  const processFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result || "";
      setCsvContent(text);
      setFileName(file.name);
      const rows = text.trim().split("\n").filter(Boolean);
      const dataRows = Math.max(0, rows.length - 1);
      setRowCount(dataRows);
    };
    reader.readAsText(file);
  };

  const handleClearFile = () => {
    setCsvContent("");
    setFileName("");
    setRowCount(0);
    setIsAuthorized(false);
  };

  const loadSampleData = (item) => {
    let sample = "";
    if (currentView === "spreadsheet") {
      sample =
        `title,body,rating,reviewer_name,reviewer_email,product_handle\n` +
        `"Top tier performance","Solid construction, works great everyday.",5,"Sarah Jenkins","sarah.j@example.com","the-complete-snowboard"\n` +
        `"Great customer support","Had a question about sizing and they helped immediately.",5,"Michael Brown","m.brown@example.com","the-complete-snowboard"`;
      setFileName("spreadsheet_reviews.csv");
    } else if (currentView === "store") {
      sample =
        `title,body,rating,review_date,reviewer_name,reviewer_email,product_handle,status,verified\n` +
        `"Transferred review","Imported seamlessly across our Shopify stores.",5,"2026-10-22","Alex Reed","alex.r@example.com","the-complete-snowboard","Published","true"`;
      setFileName("store_reviews_backup.csv");
    } else {
      sample =
        `title,body,rating,review_date,reviewer_name,reviewer_email,product_handle\n` +
        `"Outstanding build quality!","Fits like a glove and the color matches the photos perfectly.",5,"2026-10-15","Liam Walker","liam.w@example.com","the-complete-snowboard"\n` +
        `"Very impressed","Shipped promptly and packaged with care. Would purchase again.",5,"2026-10-18","Emma Davis","emma.d@example.com","the-complete-snowboard"\n` +
        `"Pretty good, as advertised","Minor seam flaw, but overall good value for the price.",4,"2026-10-19","Noah Taylor","noah.t@example.com","the-complete-snowboard"`;
      setFileName(`${item?.id || "app"}_export.csv`);
    }

    setCsvContent(sample);
    const rows = sample.trim().split("\n").filter(Boolean);
    setRowCount(Math.max(0, rows.length - 1));
  };

  const handleDownloadTemplate = () => {
    const templateCsv = `title,body,rating,reviewer_name,reviewer_email,product_handle\n"Great product!","Loved everything about it.",5,"John Doe","john@example.com","the-complete-snowboard"\n"Satisfied customer","Good delivery time and nice quality.",4,"Jane Smith","jane@example.com","the-complete-snowboard"`;
    const blob = new Blob([templateCsv], { type: "text/csv;charset=utf-8;" });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.setAttribute("download", "reviora_reviews_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  };

  const handleStartImport = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!csvContent.trim() || !isAuthorized) return;
    submit(
      {
        rawCsv: csvContent,
        source: selectedItem?.id || currentView,
        authorized: "true",
      },
      { method: "POST" }
    );
  };

  // Filtered review apps based on search
  const filteredApps = REVIEW_APPS_LIST.filter((app) =>
    app.name.toLowerCase().includes(searchAppQuery.toLowerCase())
  );

  return (
    <s-page heading="Import reviews">
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        {/* Banner feedback */}
        <div style={{ marginBottom: "16px" }}>
          {actionData?.success && (
            <s-banner tone="success" heading="Import Complete">
              <s-paragraph>
                Successfully imported <strong>{actionData.count}</strong> reviews!{" "}
                <s-button variant="tertiary" onClick={() => navigate("/app/reviews")}>
                  View in Moderation Inbox →
                </s-button>
              </s-paragraph>
            </s-banner>
          )}

          {actionData?.error && (
            <s-banner tone="critical" heading="Import Error">
              <s-paragraph>{actionData.error}</s-paragraph>
            </s-banner>
          )}

          {exportFetcher.data?.exportSuccess && (
            <s-banner tone="success" heading="Export Ready">
              <s-paragraph>
                Your CSV reviews backup (<strong>{exportFetcher.data.filename}</strong>) has been downloaded successfully.
              </s-paragraph>
            </s-banner>
          )}

          {exportFetcher.data?.exportError && (
            <s-banner tone="critical" heading="Export Failed">
              <s-paragraph>{exportFetcher.data.exportError}</s-paragraph>
            </s-banner>
          )}
        </div>

        {/* =========================================================================
            VIEW 1: "From review apps" (Judge.me layout with app search & app list)
        ========================================================================== */}
        {currentView === "apps" && (
          <s-stack gap="base">
            {/* Top header with Back arrow button */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <button
                type="button"
                onClick={handleBackToMain}
                style={{
                  border: "1px solid #D2D5D8",
                  borderRadius: "6px",
                  width: "32px",
                  height: "32px",
                  backgroundColor: "#FFFFFF",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 1px 0 rgba(0,0,0,0.05)",
                }}
                title="Back to import options"
                aria-label="Back to import options"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#202223" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>
              <s-heading size="medium">From review apps</s-heading>
            </div>

            <s-section>
              <s-stack gap="base">
                <ComplianceBanner />
                <div>
                  <s-heading size="small">Import reviews from a CSV file</s-heading>
                  <s-text tone="subdued" size="small">
                    Export reviews from your current reviews app and import them here easily.
                  </s-text>
                </div>

                {/* Search app input */}
                <div style={{ position: "relative" }}>
                  <span
                    style={{
                      position: "absolute",
                      left: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#6D7175",
                      pointerEvents: "none",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    value={searchAppQuery}
                    onChange={(e) => setSearchAppQuery(e.target.value)}
                    placeholder="Search app"
                    style={{
                      width: "100%",
                      padding: "8px 12px 8px 36px",
                      borderRadius: "6px",
                      border: "1px solid #C9CCCF",
                      fontSize: "14px",
                      outline: "none",
                      boxSizing: "border-box",
                      backgroundColor: "#FFFFFF",
                    }}
                  />
                </div>

                {/* App Rows List */}
                <div style={{ borderTop: "1px solid #E1E3E5" }}>
                  {filteredApps.map((app) => {
                    const isSelected = selectedItem?.id === app.id;

                    return (
                      <div key={app.id} style={{ borderBottom: "1px solid #E1E3E5" }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "12px 8px",
                            backgroundColor: isSelected ? "#F4F6F8" : "transparent",
                            transition: "background-color 0.15s ease",
                          }}
                        >
                          {/* Left: App Logo & Blue Link Title */}
                          <button
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setSelectedItem(null);
                                handleClearFile();
                              } else {
                                setSelectedItem(app);
                                handleClearFile();
                              }
                            }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "14px",
                              cursor: "pointer",
                              flex: 1,
                              border: "none",
                              background: "transparent",
                              padding: 0,
                              textAlign: "left",
                              font: "inherit",
                            }}
                          >
                            <AppBrandIcon appId={app.id} size={36} />
                            <span
                              style={{
                                fontSize: "14px",
                                fontWeight: "500",
                                color: "#005BD3",
                              }}
                            >
                              {app.name}
                            </span>
                          </button>

                          {/* Right: Import Action */}
                          <div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedItem(app);
                                handleClearFile();
                              }}
                              style={{
                                border: "none",
                                background: "none",
                                color: "#005BD3",
                                fontSize: "14px",
                                fontWeight: "500",
                                cursor: "pointer",
                                padding: "6px 12px",
                                borderRadius: "4px",
                              }}
                            >
                              Import
                            </button>
                          </div>
                        </div>

                        {/* Inline Upload Form when this app is selected */}
                        {isSelected && (
                          <div
                            style={{
                              padding: "16px",
                              backgroundColor: "#F9FAFB",
                              borderTop: "1px solid #E1E3E5",
                            }}
                          >
                            <s-stack gap="base">
                              <s-text tone="subdued" size="small">
                                Drop your <strong>{app.name}</strong> reviews export CSV file below.
                              </s-text>

                              <CsvDropArea
                                fileName={fileName}
                                rowCount={rowCount}
                                onFileSelected={processFile}
                                onClearFile={handleClearFile}
                                hint={`or click to upload CSV from ${app.name}`}
                              />

                              <s-stack direction="inline" justifyContent="space-between" alignItems="center">
                                <s-button variant="tertiary" onClick={() => loadSampleData(app)}>
                                  Load sample {app.name} CSV
                                </s-button>
                                <s-button variant="tertiary" onClick={() => setShowRawEditor(!showRawEditor)}>
                                  {showRawEditor ? "Hide CSV text" : "View/edit CSV text"}
                                </s-button>
                              </s-stack>

                              {showRawEditor && (
                                <textarea
                                  rows={5}
                                  value={csvContent}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setCsvContent(val);
                                    const rows = val.trim().split("\n").filter(Boolean);
                                    setRowCount(Math.max(0, rows.length - 1));
                                  }}
                                  style={{
                                    width: "100%",
                                    padding: "8px 12px",
                                    borderRadius: "6px",
                                    border: "1px solid #C9CCCF",
                                    fontFamily: "monospace",
                                    fontSize: "12px",
                                    boxSizing: "border-box",
                                    outline: "none",
                                  }}
                                />
                              )}

                              <AuthorizationCheckbox
                                checked={isAuthorized}
                                onChange={setIsAuthorized}
                                label={`I confirm that I own or have permission to import these customer reviews from ${app.name} for products sold on my store, and they are not from competitors or unauthorized sources.`}
                              />

                              <s-stack direction="inline" gap="small">
                                <s-button
                                  variant="primary"
                                  loading={isImporting ? true : undefined}
                                  disabled={!csvContent.trim() || !isAuthorized ? true : undefined}
                                  onClick={handleStartImport}
                                >
                                  Start Import
                                </s-button>
                                <s-button variant="secondary" onClick={() => { setSelectedItem(null); handleClearFile(); }}>
                                  Cancel
                                </s-button>
                              </s-stack>
                            </s-stack>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </s-stack>
            </s-section>
          </s-stack>
        )}

        {/* =========================================================================
            VIEW 2: "From a spreadsheet" (Google Sheets / Excel CSV format)
        ========================================================================== */}
        {currentView === "spreadsheet" && (
          <s-stack gap="base">
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <button
                type="button"
                onClick={handleBackToMain}
                style={{
                  border: "1px solid #D2D5D8",
                  borderRadius: "6px",
                  width: "32px",
                  height: "32px",
                  backgroundColor: "#FFFFFF",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 1px 0 rgba(0,0,0,0.05)",
                }}
                title="Back to import options"
                aria-label="Back to import options"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#202223" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>
              <s-heading size="medium">From a spreadsheet</s-heading>
            </div>

            <s-section>
              <s-stack gap="base">
                <ComplianceBanner />
                <div>
                  <s-heading size="small">Import reviews from a spreadsheet</s-heading>
                  <s-text tone="subdued" size="small">
                    Upload any CSV spreadsheet with columns for title, body, rating, reviewer_name, reviewer_email, and product_handle.
                  </s-text>
                </div>

                <s-stack direction="inline" gap="small">
                  <s-button variant="secondary" onClick={handleDownloadTemplate}>
                    Download CSV Template
                  </s-button>
                  <s-button variant="tertiary" onClick={() => loadSampleData({ id: "spreadsheet" })}>
                    Load Sample Data
                  </s-button>
                </s-stack>

                <CsvDropArea
                  fileName={fileName}
                  rowCount={rowCount}
                  onFileSelected={processFile}
                  onClearFile={handleClearFile}
                  hint="or click to browse your CSV spreadsheet"
                />

                {showRawEditor && (
                  <textarea
                    rows={5}
                    value={csvContent}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCsvContent(val);
                      const rows = val.trim().split("\n").filter(Boolean);
                      setRowCount(Math.max(0, rows.length - 1));
                    }}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #C9CCCF",
                      fontFamily: "monospace",
                      fontSize: "12px",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                )}

                <AuthorizationCheckbox
                  checked={isAuthorized}
                  onChange={setIsAuthorized}
                  label="I confirm that I own or have permission to import these customer reviews for products sold on my store, and they are not from competitors or unauthorized third-party sources."
                />

                <s-stack direction="inline" justifyContent="space-between" alignItems="center">
                  <s-button variant="tertiary" onClick={() => setShowRawEditor(!showRawEditor)}>
                    {showRawEditor ? "Hide CSV text" : "View / edit CSV text"}
                  </s-button>

                  <s-button
                    variant="primary"
                    loading={isImporting ? true : undefined}
                    disabled={!csvContent.trim() || !isAuthorized ? true : undefined}
                    onClick={handleStartImport}
                  >
                    Start Import
                  </s-button>
                </s-stack>
              </s-stack>
            </s-section>
          </s-stack>
        )}

        {/* =========================================================================
            VIEW 3: "From another store you own"
        ========================================================================== */}
        {currentView === "store" && (
          <s-stack gap="base">
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <button
                type="button"
                onClick={handleBackToMain}
                style={{
                  border: "1px solid #D2D5D8",
                  borderRadius: "6px",
                  width: "32px",
                  height: "32px",
                  backgroundColor: "#FFFFFF",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 1px 0 rgba(0,0,0,0.05)",
                }}
                title="Back to import options"
                aria-label="Back to import options"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#202223" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>
              <s-heading size="medium">From another store you own</s-heading>
            </div>

            <s-section>
              <s-stack gap="base">
                <ComplianceBanner />
                <div>
                  <s-heading size="small">Transfer reviews from another Shopify store you own</s-heading>
                  <s-text tone="subdued" size="small">
                    Export a CSV backup from your other store and upload it below to transfer reviews you own between stores.
                  </s-text>
                </div>

                <CsvDropArea
                  fileName={fileName}
                  rowCount={rowCount}
                  onFileSelected={processFile}
                  onClearFile={handleClearFile}
                  hint="or click to browse your backup CSV"
                />

                <s-stack direction="inline" justifyContent="space-between" alignItems="center">
                  <s-button variant="tertiary" onClick={() => loadSampleData({ id: "store" })}>
                    Load sample store backup
                  </s-button>
                </s-stack>

                <AuthorizationCheckbox
                  checked={isAuthorized}
                  onChange={setIsAuthorized}
                  label="I confirm that I own or operate the source store and am authorized to use and transfer these reviews."
                />

                <s-stack direction="inline" gap="small">
                  <s-button
                    variant="primary"
                    loading={isImporting ? true : undefined}
                    disabled={!csvContent.trim() || !isAuthorized ? true : undefined}
                    onClick={handleStartImport}
                  >
                    Start Import
                  </s-button>
                  <s-button variant="secondary" onClick={() => { setSelectedItem(null); handleClearFile(); }}>
                    Cancel
                  </s-button>
                </s-stack>
              </s-stack>
            </s-section>
          </s-stack>
        )}

        {/* =========================================================================
            MAIN VIEW: The 3 authorized category blocks
        ========================================================================== */}
        {currentView === null && (
          <s-stack gap="base">
            <s-section>
              <s-stack gap="base">
                <ComplianceBanner />
                <s-heading size="small">Import reviews</s-heading>

                <s-stack gap="small">
                  {/* Option 1: From review apps */}
                  <div
                    style={{
                      border: "1px solid #D2D5D8",
                      borderRadius: "8px",
                      padding: "18px 24px",
                      backgroundColor: "#FFFFFF",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "24px",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {/* Logos row */}
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <AppBrandIcon appId="judge_me" size={34} />
                        <AppBrandIcon appId="loox" size={34} />
                        <AppBrandIcon appId="yotpo" size={34} />
                        <AppBrandIcon appId="okendo" size={34} />
                        <AppBrandIcon appId="klaviyo" size={34} />
                      </div>

                      <div>
                        <s-heading size="small">From review apps</s-heading>
                        <s-text tone="subdued" size="small">
                          Migrate your reviews from Judge.me, Loox, Yotpo, Okendo, Klaviyo, Air Reviews, and others.
                        </s-text>
                      </div>
                    </div>

                    <div style={{ flexShrink: 0 }}>
                      <s-button onClick={() => handleNavigateTo("apps")}>
                        Import from apps
                      </s-button>
                    </div>
                  </div>

                  {/* Option 2: From a spreadsheet */}
                  <div
                    style={{
                      border: "1px solid #D2D5D8",
                      borderRadius: "8px",
                      padding: "18px 24px",
                      backgroundColor: "#FFFFFF",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "24px",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      <img
                        src="/review_request/spreedsheet.png"
                        alt="Yotpo"
                        style={{
                          width: 34,
                          height: 34,
                          objectFit: "contain",
                          borderRadius: "6px",
                          display: "block",
                          flexShrink: 0,
                          boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                        }}
                      />

                      <div>
                        <s-heading size="small">From a spreadsheet</s-heading>
                        <s-text tone="subdued" size="small">
                          Import your own verified reviews from a CSV spreadsheet format.
                        </s-text>
                      </div>
                    </div>

                    <div style={{ flexShrink: 0 }}>
                      <s-button onClick={() => handleNavigateTo("spreadsheet")}>
                        Import from a spreadsheet
                      </s-button>
                    </div>
                  </div>

                  {/* Option 3: From another store you own */}
                  <div
                    style={{
                      border: "1px solid #D2D5D8",
                      borderRadius: "8px",
                      padding: "18px 24px",
                      backgroundColor: "#FFFFFF",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "24px",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      <img
                        src="/review_request/shopify.png"
                        alt="Yotpo"
                        style={{
                          width: 34,
                          height: 34,
                          objectFit: "contain",
                          borderRadius: "6px",
                          display: "block",
                          flexShrink: 0,
                          boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                        }}
                      />

                      <div>
                        <s-heading size="small">From another store you own</s-heading>
                        <s-text tone="subdued" size="small">
                          Transfer customer reviews from another store that you own and operate.
                        </s-text>
                      </div>
                    </div>

                    <div style={{ flexShrink: 0 }}>
                      <s-button onClick={() => handleNavigateTo("store")}>
                        Import from another store
                      </s-button>
                    </div>
                  </div>
                </s-stack>
              </s-stack>
            </s-section>

            {/* Export Reviews Backup Section */}
            <s-section>
              <s-stack direction="inline" justifyContent="space-between" alignItems="center">
                <s-stack gap="extra-tight">
                  <s-heading size="small">Download Reviews Backup</s-heading>
                  <s-text tone="subdued" size="small">
                    Download all customer reviews currently stored in your Reviora database as a CSV file.
                  </s-text>
                </s-stack>
                <s-button
                  variant="primary"
                  loading={isExporting ? true : undefined}
                  onClick={handleExport}
                >
                  Export All Reviews (CSV)
                </s-button>
              </s-stack>
            </s-section>
          </s-stack>
        )}
      </div>
    </s-page>
  );
}
