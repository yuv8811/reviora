/**
 * Reviora Storefront Widgets Configuration
 * 
 * To add a new widget:
 * Simply add a new object to the `widgetsConfig` array below.
 * It will automatically render on the Widgets page with Install and Customize support.
 */

export const widgetsConfig = [
  {
    id: "review_widget",
    title: "Review Widget",
    description: "Collect and display product reviews on your product pages.",
    badge: null,
    badgeTone: "success",
    hasInstall: true,
    blockHandle: "review_widget",
    blockName: "Reviora Reviews Widget",
    template: "product",
    defaultSettings: {
      starColor: "#FFB800",
      accentColor: "#0F172A",
      headerTitle: "Customer Reviews",
      subheading: "Real reviews from verified buyers",
      layout: "standard",
      showVerifiedBadge: true,
      showRatingFilter: true,
      showBreakdown: true,
      showMediaUpload: true,
      reviewsPerPage: 5,
    },
    snippet: (shop) =>
      `<reviora-reviews-widget data-shop="${shop}" data-product-id="{{ product.handle }}"></reviora-reviews-widget>`,
    preview: {
      gradient: "linear-gradient(135deg, #a7f3d0 0%, #6ee7b7 50%, #bbf7d0 100%)",
      accentColor: "#10b981",
      icon: "💬",
      render: () => (
        <div
          style={{
            width: "92%",
            background: "#ffffff",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            padding: "10px 14px",
            boxSizing: "border-box",
          }}
        >
          <div style={{ textAlign: "center", fontSize: "11px", fontWeight: "700", color: "#374151", marginBottom: "8px" }}>
            Customer Reviews
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
            <div style={{ color: "#10b981", fontSize: "11px", letterSpacing: "1px" }}>★★★★★</div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "3px" }}>
              <div style={{ height: "3px", background: "#10b981", borderRadius: "2px", width: "85%" }} />
              <div style={{ height: "3px", background: "#34d399", borderRadius: "2px", width: "55%" }} />
              <div style={{ height: "3px", background: "#cbd5e1", borderRadius: "2px", width: "20%" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
              <div style={{ height: "9px", width: "36px", borderRadius: "10px", background: "#1e293b" }} />
              <div style={{ height: "9px", width: "36px", borderRadius: "10px", border: "1px solid #cbd5e1" }} />
            </div>
          </div>
          <div style={{ height: "1px", background: "#f1f5f9", margin: "8px 0" }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: "4px" }}>
              <div style={{ width: "20px", height: "20px", borderRadius: "4px", background: "#f59e0b", opacity: 0.85 }} />
              <div style={{ width: "20px", height: "20px", borderRadius: "4px", background: "#3b82f6", opacity: 0.85 }} />
              <div style={{ width: "20px", height: "20px", borderRadius: "4px", background: "#ec4899", opacity: 0.85 }} />
              <div style={{ width: "20px", height: "20px", borderRadius: "4px", background: "#8b5cf6", opacity: 0.85 }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
              <span style={{ fontSize: "12px" }}>🛡️</span>
              <span style={{ fontSize: "9px", color: "#059669", fontWeight: "600" }}>Verified</span>
            </div>
          </div>
        </div>
      ),
    },
  },
  {
    id: "write_review",
    title: "Write a Review",
    description: "A pre-installed widget to help your customers write reviews.",
    badge: null,
    badgeTone: "success",
    hasInstall: true,
    blockHandle: "review_widget",
    blockName: "Write a Review Form",
    template: "product",
    defaultSettings: {
      buttonText: "Write a review",
      buttonColor: "#10B981",
      buttonTextColor: "#ffffff",
      starColor: "#FFB800",
      allowPhotoUpload: true,
    },
    snippet: () =>
      `<reviora-write-review-button product-id="{{ product.handle }}"></reviora-write-review-button>`,
    preview: {
      gradient: "linear-gradient(135deg, #bbf7d0 0%, #86efac 50%, #a7f3d0 100%)",
      accentColor: "#10b981",
      icon: "✍️",
      render: () => (
        <div
          style={{
            width: "82%",
            background: "#ffffff",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            padding: "12px 14px",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: "11px", fontWeight: "600", color: "#374151", marginBottom: "6px" }}>
            Write a review
          </div>
          <div style={{ color: "#64748b", fontSize: "16px", letterSpacing: "3px", marginBottom: "8px" }}>
            ☆☆☆☆☆
          </div>
          <div style={{ width: "100%", height: "8px", background: "#f1f5f9", borderRadius: "4px", marginBottom: "6px" }} />
          <div style={{ width: "100%", height: "18px", border: "1px solid #e2e8f0", borderRadius: "4px", marginBottom: "8px" }} />
          <div
            style={{
              background: "#86efac",
              color: "#065f46",
              fontSize: "10px",
              fontWeight: "600",
              padding: "3px 12px",
              borderRadius: "12px",
            }}
          >
            Submit review
          </div>
        </div>
      ),
    },
  },
  {
    id: "cards_carousel",
    title: "Cards Carousel",
    description: "Showcase reviews in a carousel on a page of your choice. Flexible styling in the Shopify Theme Editor.",
    badge: null,
    badgeTone: "info",
    hasInstall: true,
    blockHandle: "cards_carousel",
    blockName: "Reviora Cards Carousel",
    template: "index",
    defaultSettings: {
      heading: "Loved by Our Customers",
      subheading: "Read real, verified reviews from shoppers across our collection",
      starColor: "#FFB800",
      limit: 8,
      autoplay: true,
    },
    snippet: (shop) => `<reviora-reviews-carousel type="cards" data-shop="${shop}"></reviora-reviews-carousel>`,
    preview: {
      gradient: "linear-gradient(135deg, #86efac 0%, #4ade80 50%, #86efac 100%)",
      accentColor: "#059669",
      icon: "🎴",
      render: () => (
        <div style={{ display: "flex", alignItems: "center", width: "100%", gap: "4px", padding: "0 4px" }}>
          <span style={{ fontSize: "14px", color: "#065f46", fontWeight: "bold" }}>‹</span>
          <div style={{ display: "flex", gap: "6px", flex: 1, justifyContent: "center" }}>
            {[
              { color: "#f87171", name: "Barbara S." },
              { color: "#fbbf24", name: "Barbara S." },
              { color: "#fb923c", name: "Barbara S." },
              { color: "#e2e8f0", name: "Barbara S." },
            ].map((card, idx) => (
              <div
                key={idx}
                style={{
                  width: "48px",
                  background: "#fff",
                  borderRadius: "6px",
                  padding: "4px",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                }}
              >
                <div style={{ height: "40px", background: card.color, borderRadius: "4px", marginBottom: "3px" }} />
                <div style={{ fontSize: "7px", color: "#0f766e" }}>★★★★</div>
                <div style={{ fontSize: "6px", color: "#64748b" }}>{card.name}</div>
              </div>
            ))}
          </div>
          <span style={{ fontSize: "14px", color: "#065f46", fontWeight: "bold" }}>›</span>
        </div>
      ),
    },
  },
  {
    id: "testimonials_carousel",
    title: "Testimonials Carousel",
    description: "Display customer quotes to build trust and social proof. Flexible styling in the Shopify Theme Editor.",
    badge: null,
    badgeTone: "info",
    hasInstall: true,
    blockHandle: "testimonials_carousel",
    blockName: "Reviora Testimonials",
    template: "index",
    defaultSettings: {
      heading: "What Our Customers Say",
      subheading: "Real stories from verified buyers",
      starColor: "#FFB800",
      limit: 6,
      autoplay: true,
    },
    snippet: (shop) => `<reviora-reviews-carousel type="testimonials" data-shop="${shop}"></reviora-reviews-carousel>`,
    preview: {
      gradient: "linear-gradient(135deg, #6ee7b7 0%, #34d399 50%, #6ee7b7 100%)",
      accentColor: "#0d9488",
      icon: "💬",
      render: () => (
        <div
          style={{
            width: "88%",
            background: "#ffffff",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            padding: "14px 16px",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: "28px", lineHeight: "18px", color: "#0f172a", fontWeight: "bold", fontFamily: "serif", marginBottom: "8px" }}>
            ”
          </div>
          <div style={{ width: "90%", height: "4px", background: "#e2e8f0", borderRadius: "2px", marginBottom: "4px" }} />
          <div style={{ width: "75%", height: "4px", background: "#e2e8f0", borderRadius: "2px", marginBottom: "4px" }} />
          <div style={{ width: "50%", height: "4px", background: "#f1f5f9", borderRadius: "2px", marginBottom: "8px" }} />
          <div style={{ color: "#38bdf8", fontSize: "13px", letterSpacing: "2px" }}>
            ★★★★★
          </div>
        </div>
      ),
    },
  },
  {
    id: "videos_carousel",
    title: "Videos Carousel",
    description: "Showcase customer video reviews in a dynamic widget. Flexible styling in the Shopify Theme Editor.",
    badge: "PRO",
    badgeTone: "warning",
    isPremium: true,
    hasInstall: true,
    blockHandle: "video_reels",
    blockName: "Reviora Video Reels",
    template: "index",
    defaultSettings: {
      heading: "Watch Customer Stories",
      subheading: "Authentic video & photo reviews from verified buyers",
      starColor: "#FFB800",
      limit: 8,
      autoplay: false,
    },
    snippet: (shop) => `<reviora-reviews-carousel type="videos" data-shop="${shop}"></reviora-reviews-carousel>`,
    preview: {
      gradient: "linear-gradient(135deg, #60a5fa 0%, #3b82f6 50%, #93c5fd 100%)",
      accentColor: "#2563eb",
      icon: "🎥",
      render: () => (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}>
          <div style={{ width: "36px", height: "68px", background: "#1e3a8a", opacity: 0.8, borderRadius: "6px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#93c5fd", fontSize: "10px" }}>▶</span>
            <div style={{ color: "#fbbf24", fontSize: "6px", marginTop: "10px" }}>★★★★★</div>
          </div>
          <div style={{ width: "58px", height: "90px", background: "#1e293b", borderRadius: "8px", overflow: "hidden", position: "relative", boxShadow: "0 6px 14px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: "100%", height: "100%", background: "linear-gradient(180deg, #f43f5e 0%, #881337 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "10px" }}>
                ▶
              </div>
              <div style={{ color: "#fbbf24", fontSize: "8px", position: "absolute", bottom: "6px" }}>★★★★★</div>
            </div>
          </div>
          <div style={{ width: "36px", height: "68px", background: "#1e3a8a", opacity: 0.8, borderRadius: "6px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#93c5fd", fontSize: "10px" }}>▶</span>
            <div style={{ color: "#fbbf24", fontSize: "6px", marginTop: "10px" }}>★★★★★</div>
          </div>
        </div>
      ),
    },
  },
  {
    id: "star_rating",
    title: "Star Rating Badge",
    description: "Compact stars and review count placed directly under product titles or collection cards.",
    badge: "Essential",
    badgeTone: "success",
    hasInstall: true,
    blockHandle: "star_rating",
    blockName: "Star Rating Badge",
    template: "product",
    defaultSettings: {
      starColor: "#FFB800",
      textColor: "#0F172A",
      showNumericRating: true,
      showReviewCount: true,
    },
    snippet: () =>
      `<div class="reviora-star-badge-block"><span class="reviora-badge-stars">★★★★★</span> <span>4.9 (128 reviews)</span></div>`,
    preview: {
      gradient: "linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #fef3c7 100%)",
      accentColor: "#d97706",
      icon: "⭐",
      render: () => (
        <div style={{ background: "#ffffff", borderRadius: "8px", padding: "12px 18px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", display: "inline-flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: "#FFB800", fontSize: "16px", letterSpacing: "1px" }}>★★★★★</span>
          <span style={{ fontWeight: 700, fontSize: "14px", color: "#0f172a" }}>4.9</span>
          <span style={{ fontSize: "12px", color: "#64748b" }}>(128 reviews)</span>
        </div>
      ),
    },
  },
  {
    id: "floating_tab",
    title: "Floating Reviews Drawer",
    description: "A persistent floating side tab that lets shoppers slide open customer reviews from any page.",
    badge: "PRO",
    badgeTone: "warning",
    isPremium: true,
    hasInstall: true,
    blockHandle: "floating_tab",
    blockName: "Floating Reviews Tab",
    template: "index",
    defaultSettings: {
      buttonText: "★ Reviews",
      buttonColor: "#0F172A",
      buttonTextColor: "#FFFFFF",
      starColor: "#FFB800",
      accentColor: "#0F172A",
    },
    snippet: () => `<reviora-floating-tab></reviora-floating-tab>`,
    preview: {
      gradient: "linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 50%, #e0e7ff 100%)",
      accentColor: "#4f46e5",
      icon: "📑",
      render: () => (
        <div style={{ position: "relative", width: "100%", height: "90px", display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: "10px" }}>
          <div style={{ background: "#0f172a", color: "#fff", padding: "8px 14px", borderRadius: "8px 0 0 8px", fontSize: "11px", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px", boxShadow: "0 4px 12px rgba(0,0,0,0.18)" }}>
            <span style={{ color: "#FFB800" }}>★</span> 4.9 Reviews
          </div>
        </div>
      ),
    },
  },
  {
    id: "all_reviews_page",
    title: "All Reviews Page",
    description: "A dedicated store review center for /pages/reviews to maximize Google SEO and social proof.",
    badge: "SEO Boost",
    badgeTone: "success",
    hasInstall: true,
    blockHandle: "all_reviews_page",
    blockName: "All Reviews Page",
    template: "page",
    defaultSettings: {
      heading: "All Store Reviews",
      subheading: "Verified customer feedback from across our entire catalog",
      starColor: "#FFB800",
      accentColor: "#0F172A",
      textColor: "#0F172A",
      showVerifiedBadge: true,
      reviewsPerPage: 10,
    },
    snippet: () => `<reviora-all-reviews-page></reviora-all-reviews-page>`,
    preview: {
      gradient: "linear-gradient(135deg, #dcfce7 0%, #bbf7d0 50%, #dcfce7 100%)",
      accentColor: "#16a34a",
      icon: "🌟",
      render: () => (
        <div style={{ width: "90%", background: "#fff", borderRadius: "8px", padding: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", textAlign: "center" }}>
          <div style={{ fontSize: "11px", fontWeight: "700", color: "#0f172a" }}>All Store Reviews</div>
          <div style={{ color: "#FFB800", fontSize: "11px", margin: "3px 0" }}>★★★★★ 4.9 / 5.0</div>
          <div style={{ fontSize: "9px", color: "#64748b" }}>Based on 1,280 verified buyers</div>
        </div>
      ),
    },
  },
  {
    id: "review_popups",
    title: "Social Proof Review Toasts",
    description: "Automatic corner popups showing real recent reviews to create urgency and build shopper trust.",
    badge: "PRO",
    badgeTone: "warning",
    isPremium: true,
    hasInstall: true,
    blockHandle: "review_popups",
    blockName: "Social Proof Review Toasts",
    template: "index",
    defaultSettings: {
      starColor: "#FFB800",
      accentColor: "#0F172A",
      textColor: "#0F172A",
      autoplay: true,
    },
    snippet: () => `<reviora-review-popups></reviora-review-popups>`,
    preview: {
      gradient: "linear-gradient(135deg, #ffedd5 0%, #fed7aa 50%, #ffedd5 100%)",
      accentColor: "#ea580c",
      icon: "🔔",
      render: () => (
        <div style={{ width: "92%", background: "#fff", borderRadius: "8px", padding: "8px 10px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#f97316", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: "700" }}>SJ</div>
          <div style={{ flex: 1, textAlign: "left" }}>
            <div style={{ fontSize: "10px", fontWeight: "700", color: "#0f172a" }}>Sarah J. • <span style={{ color: "#FFB800" }}>★★★★★</span></div>
            <div style={{ fontSize: "8px", color: "#64748b", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>&quot;Best purchase this year!&quot;</div>
          </div>
        </div>
      ),
    },
  },
  {
    id: "ugc_media_grid",
    title: "UGC Photo & Video Wall",
    description: "Visual Instagram/Pinterest masonry grid showcasing customer photos and videos with lightbox.",
    badge: "PRO",
    badgeTone: "warning",
    isPremium: true,
    hasInstall: true,
    blockHandle: "ugc_media_grid",
    blockName: "Photo & Video Wall",
    template: "index",
    defaultSettings: {
      heading: "Customer Photos & Videos",
      subheading: "Real photos shared by verified customers",
      starColor: "#FFB800",
      accentColor: "#0F172A",
    },
    snippet: () => `<reviora-ugc-media-grid></reviora-ugc-media-grid>`,
    preview: {
      gradient: "linear-gradient(135deg, #fae8ff 0%, #f5d0fe 50%, #fae8ff 100%)",
      accentColor: "#c026d3",
      icon: "📸",
      render: () => (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "4px", width: "80%" }}>
          {["#ec4899", "#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#06b6d4"].map((bg, i) => (
            <div key={i} style={{ height: "32px", borderRadius: "4px", background: bg, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "10px" }}>📷</div>
          ))}
        </div>
      ),
    },
  },
  {
    id: "trust_badge",
    title: "Trust & Checkout Badge",
    description: "Compact conversion badge placed next to 'Add to Cart' or in footer to reduce cart abandonment.",
    badge: "Conversion",
    badgeTone: "success",
    hasInstall: true,
    blockHandle: "trust_badge",
    blockName: "Trust & Checkout Badge",
    template: "product",
    defaultSettings: {
      buttonText: "{rating}/5 from {count}+ Verified Buyers",
      starColor: "#FFB800",
      badgeColor: "#059669",
      accentColor: "#0F172A",
      showVerifiedBadge: true,
      hideIfEmpty: false,
    },
    snippet: (settings = {}) => {
      const text = settings.buttonText || "{rating}/5 from {count}+ Verified Buyers";
      return `<div class="reviora-trust-badge-pill">★ ${text}</div>`;
    },
    preview: {
      gradient: "linear-gradient(135deg, #ccfbf1 0%, #99f6e4 50%, #ccfbf1 100%)",
      accentColor: "#0f766e",
      icon: "🛡️",
      render: () => (
        <div style={{ background: "#fff", borderRadius: "999px", padding: "6px 14px", border: "1px solid #14b8a6", display: "inline-flex", alignItems: "center", gap: "6px", boxShadow: "0 2px 6px rgba(0,0,0,0.06)" }}>
          <span style={{ color: "#FFB800", fontSize: "11px" }}>★★★★★</span>
          <span style={{ fontSize: "10px", fontWeight: "700", color: "#0f172a" }}>4.9/5 Trust Badge</span>
          <span style={{ color: "#059669", fontSize: "9px" }}>✓ Verified</span>
        </div>
      ),
    },
  },
  {
    id: "qa_widget",
    title: "Product Q&A Widget",
    description: "Interactive Questions and Answers accordion on product pages to answer shopper questions.",
    badge: null,
    badgeTone: "info",
    hasInstall: true,
    blockHandle: "qa_widget",
    blockName: "Product Q&A",
    template: "product",
    defaultSettings: {
      heading: "Customer Questions & Answers",
      subheading: "Have questions? Ask our verified community or store staff.",
      accentColor: "#0F172A",
      textColor: "#0F172A",
    },
    snippet: () => `<reviora-qa-widget></reviora-qa-widget>`,
    preview: {
      gradient: "linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 50%, #f1f5f9 100%)",
      accentColor: "#475569",
      icon: "❓",
      render: () => (
        <div style={{ width: "90%", background: "#fff", borderRadius: "8px", padding: "10px 12px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", textAlign: "left" }}>
          <div style={{ fontSize: "10px", fontWeight: "700", color: "#0f172a", marginBottom: "4px" }}>Q: How is the sizing?</div>
          <div style={{ fontSize: "8px", color: "#64748b" }}>A: Fits true to size with room for comfort.</div>
        </div>
      ),
    },
  },
];
