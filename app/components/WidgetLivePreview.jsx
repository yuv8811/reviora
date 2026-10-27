import { useMemo } from "react";

const AUTHENTIC_LIFESTYLE_MEDIA = [
  {
    name: "Sarah Jenkins",
    stars: 5,
    tag: "Verified Buyer",
    caption: "The quality is simply unmatched! Super soft & fits true to size.",
    url: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&auto=format&fit=crop&q=80",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80",
    isVideo: false,
    duration: null,
    product: "Signature Wool Coat",
  },
  {
    name: "Marcus Vance",
    stars: 5,
    tag: "Video Review",
    caption: "Unboxing & try-on haul. Honestly 10/10 finish and comfort.",
    url: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&auto=format&fit=crop&q=80",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80",
    isVideo: true,
    duration: "0:42",
    product: "Everyday Street Hoodie",
  },
  {
    name: "Emily Watson",
    stars: 5,
    tag: "Verified Buyer",
    caption: "Color is exactly as pictured. Got compliments the first day!",
    url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&auto=format&fit=crop&q=80",
    isVideo: false,
    duration: null,
    product: "Performance Runner Sneakers",
  },
  {
    name: "David Miller",
    stars: 5,
    tag: "Verified Buyer",
    caption: "Great craftsmanship and attention to detail. Fast 2-day delivery.",
    url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80",
    isVideo: false,
    duration: null,
    product: "Minimalist Chrono Watch",
  },
  {
    name: "Chloe King",
    stars: 5,
    tag: "Video Review",
    caption: "30-day review: Packaging was luxury grade and it holds up great.",
    url: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&auto=format&fit=crop&q=80",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
    isVideo: true,
    duration: "1:15",
    product: "Hydrating Beauty Serum",
  },
  {
    name: "Jessica Taylor",
    stars: 5,
    tag: "Verified Buyer",
    caption: "Superior quality leather and hardware. Beautiful texture.",
    url: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&auto=format&fit=crop&q=80",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80",
    isVideo: false,
    duration: null,
    product: "Leather Crossbody Bag",
  },
];

export function WidgetLivePreview({
  widgetId = "review_widget",
  settings = {},
  realReviews = [],
  aggregateData = null,
}) {
  const starColor = settings.starColor || "#FFB800";
  const accentColor = settings.accentColor || "#0F172A";
  const badgeColor = settings.badgeColor || "#059669";
  const textColor = settings.textColor || "#0F172A";
  const buttonColor = settings.buttonColor || "#10B981";
  const buttonTextColor = settings.buttonTextColor || "#ffffff";
  const layout = settings.layout || "standard";

  const effectiveReviews = useMemo(() => {
    if (realReviews && realReviews.length > 0) {
      return realReviews.map((r, i) => {
        const fallback = AUTHENTIC_LIFESTYLE_MEDIA[i % AUTHENTIC_LIFESTYLE_MEDIA.length];
        const m = r.media && r.media.length > 0 ? r.media[0] : null;
        const isVid = m ? (m.mediaType === "VIDEO" || /\.(mp4|webm)($|\?)/i.test(m.url)) : fallback.isVideo;
        return {
          id: r._id || `rev-${i}`,
          authorName: r.authorName || fallback.name,
          avatar: fallback.avatar,
          rating: Number(r.rating) || 5,
          title: r.title || fallback.product,
          body: r.body || fallback.caption,
          productTitle: r.productTitle || fallback.product,
          productImage: m ? m.url : fallback.url,
          mediaUrl: m ? m.url : fallback.url,
          isVideo: isVid,
          duration: isVid ? "0:45" : null,
          date: r.createdAt ? new Date(r.createdAt).toLocaleDateString() : `${i + 1} days ago`,
          verified: true,
          helpfulCount: r.helpfulCount || (10 + (i * 3)),
          mediaList: r.media && r.media.length > 0 ? r.media : [{ url: fallback.url, mediaType: isVid ? "VIDEO" : "IMAGE" }],
        };
      });
    }
    return AUTHENTIC_LIFESTYLE_MEDIA.map((m, i) => ({
      id: `sample-${i}`,
      authorName: m.name,
      avatar: m.avatar,
      rating: m.stars,
      title: m.product,
      body: m.caption,
      productTitle: m.product,
      productImage: m.url,
      mediaUrl: m.url,
      isVideo: m.isVideo,
      duration: m.duration,
      date: `${i + 1} day${i === 0 ? "" : "s"} ago`,
      verified: true,
      helpfulCount: 14 - i,
      mediaList: [{ url: m.url, mediaType: m.isVideo ? "VIDEO" : "IMAGE" }],
    }));
  }, [realReviews]);

  const avgScore = aggregateData?.averageRating || (realReviews.length > 0 ? (realReviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0) / realReviews.length).toFixed(1) : "4.9");
  const totalReviewsCount = aggregateData?.total || (realReviews.length > 0 ? realReviews.length : 128);

  const renderStars = (rating = 5, size = 16) => {
    const full = Math.floor(rating);
    const hasHalf = rating - full >= 0.5;
    return (
      <span style={{ display: "inline-flex", gap: "2px", alignItems: "center" }}>
        {[1, 2, 3, 4, 5].map((i) => {
          const isFilled = i <= full;
          const isHalf = i === full + 1 && hasHalf;
          return (
            <svg
              key={i}
              viewBox="0 0 24 24"
              style={{
                width: `${size}px`,
                height: `${size}px`,
                fill: isFilled ? starColor : isHalf ? starColor : "#e2e8f0",
                display: "inline-block",
              }}
            >
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
            </svg>
          );
        })}
      </span>
    );
  };

  // 1. CARDS CAROUSEL FRONTEND LAYOUT
  if (widgetId === "cards_carousel") {
    const cardLimit = Number(settings.limit || 6);
    return (
      <div className="reviora-carousel-block" style={{ margin: "0", padding: "0" }}>
        <div className="reviora-carousel-header" style={{ marginBottom: "20px" }}>
          <h2 className="reviora-carousel-title" style={{ fontSize: "20px", color: textColor }}>
            {settings.heading || "Loved by Our Customers"}
          </h2>
          <p className="reviora-carousel-sub" style={{ fontSize: "13px" }}>
            {settings.subheading || "Read real reviews from verified shoppers"}
          </p>
        </div>

        <div className="reviora-carousel-track-wrap" style={{ padding: "0 0 10px 0" }}>
          <div className="reviora-carousel-track" style={{ gap: "14px" }}>
            {effectiveReviews.slice(0, cardLimit).map((card, idx) => (
              <div key={idx} className="reviora-carousel-card" style={{ flex: "1 1 220px", padding: "18px" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <img
                        src={card.avatar}
                        alt={card.authorName}
                        style={{ width: "22px", height: "22px", borderRadius: "50%", objectFit: "cover" }}
                      />
                      <div style={{ fontWeight: 700, fontSize: "13px", color: textColor }}>{card.authorName}</div>
                    </div>
                    <span className="reviora-verified-badge" style={{ color: badgeColor, background: `${badgeColor}15` }}>
                      <svg viewBox="0 0 24 24" style={{ width: "11px", height: "11px", fill: "currentColor" }}>
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                      </svg>
                      Verified
                    </span>
                  </div>
                  <div style={{ marginBottom: "6px" }}>{renderStars(card.rating, 14)}</div>
                  <div style={{ fontWeight: 700, fontSize: "13px", color: textColor, marginBottom: "4px" }}>{card.title}</div>
                  <p style={{ margin: 0, fontSize: "12px", color: "#64748b", lineHeight: "1.4" }}>{card.body}</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "12px", paddingTop: "8px", borderTop: "1px solid #f1f5f9" }}>
                  <img
                    src={card.productImage}
                    alt={card.productTitle}
                    style={{ width: "28px", height: "28px", borderRadius: "6px", objectFit: "cover" }}
                  />
                  <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "600", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {card.productTitle}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 2. TESTIMONIALS CAROUSEL FRONTEND LAYOUT
  if (widgetId === "testimonials_carousel") {
    const featuredReview = effectiveReviews[0];
    return (
      <div className="reviora-carousel-block" style={{ margin: "0", padding: "0" }}>
        <div className="reviora-carousel-header" style={{ marginBottom: "20px" }}>
          <h2 className="reviora-carousel-title" style={{ fontSize: "20px", color: textColor }}>
            {settings.heading || "What Our Customers Say"}
          </h2>
          <p className="reviora-carousel-sub" style={{ fontSize: "13px" }}>
            {settings.subheading || "Real stories from verified buyers"}
          </p>
        </div>

        <div style={{ display: "flex", justifyContent: "center" }}>
          <div className="reviora-testimonial-slide" style={{ flex: "0 0 100%", padding: "26px 24px", maxWidth: "600px" }}>
            <div className="reviora-testimonial-quote-icon" style={{ color: accentColor }}>&ldquo;</div>
            <p className="reviora-testimonial-text" style={{ fontSize: "15px", lineHeight: "1.5" }}>
              &quot;{featuredReview.body}&quot;
            </p>
            <div style={{ marginBottom: "10px" }}>{renderStars(featuredReview.rating, 16)}</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              <img
                src={featuredReview.avatar}
                alt={featuredReview.authorName}
                style={{ width: "26px", height: "26px", borderRadius: "50%", objectFit: "cover" }}
              />
              <div style={{ fontWeight: 700, fontSize: "14px", color: textColor }}>{featuredReview.authorName}</div>
            </div>
            <span className="reviora-verified-badge" style={{ color: badgeColor, background: `${badgeColor}15`, marginTop: "8px", display: "inline-flex" }}>
              <svg viewBox="0 0 24 24" style={{ width: "11px", height: "11px", fill: "currentColor" }}>
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
              Verified Buyer
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 3. VIDEO REELS CAROUSEL FRONTEND LAYOUT
  if (widgetId === "videos_carousel") {
    const reelLimit = Number(settings.limit || 8);
    return (
      <div className="reviora-carousel-block" style={{ margin: "0", padding: "0" }}>
        <div className="reviora-carousel-header" style={{ marginBottom: "20px" }}>
          <h2 className="reviora-carousel-title" style={{ fontSize: "20px", color: textColor }}>
            {settings.heading || "Watch Customer Stories"}
          </h2>
          <p className="reviora-carousel-sub" style={{ fontSize: "13px" }}>
            {settings.subheading || "Authentic video & photo reviews from verified buyers"}
          </p>
        </div>

        <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
          {effectiveReviews.slice(0, Math.min(reelLimit, 4)).map((r, idx) => (
            <div
              key={idx}
              className="reviora-video-reel-slide"
              style={{
                flex: "0 0 145px",
                height: "230px",
                borderRadius: "14px",
                overflow: "hidden",
                position: "relative",
                boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
                background: "#0f172a",
                cursor: "pointer",
              }}
            >
              <img
                src={r.mediaUrl}
                alt={r.authorName}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
              <div
                style={{
                  position: "absolute",
                  top: "10px",
                  right: "10px",
                  background: "rgba(15, 23, 42, 0.75)",
                  backdropFilter: "blur(6px)",
                  color: "#ffffff",
                  padding: "3px 8px",
                  borderRadius: "16px",
                  fontSize: "10px",
                  fontWeight: "700",
                }}
              >
                ▶ {r.duration || "0:45"}
              </div>

              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: "42px",
                  height: "42px",
                  borderRadius: "50%",
                  background: "rgba(255, 255, 255, 0.35)",
                  backdropFilter: "blur(8px)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  fontSize: "13px",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
                  border: "1.5px solid rgba(255,255,255,0.7)",
                }}
              >
                ▶
              </div>

              <div
                className="reviora-video-reel-overlay"
                style={{
                  padding: "14px 10px 10px 10px",
                  background: "linear-gradient(to top, rgba(15,23,42,0.92) 0%, rgba(15,23,42,0.4) 60%, transparent 100%)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
                  <img
                    src={r.avatar}
                    alt={r.authorName}
                    style={{ width: "18px", height: "18px", borderRadius: "50%", objectFit: "cover" }}
                  />
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#ffffff" }}>{r.authorName}</div>
                </div>
                <div>{renderStars(r.rating, 10)}</div>
                <div style={{ fontSize: "9px", opacity: 0.85, marginTop: "2px", color: "#ffffff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.productTitle}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 4. WRITE A REVIEW BUTTON FRONTEND LAYOUT
  if (widgetId === "write_review") {
    return (
      <div className="reviora-widget-container" style={{ margin: "0", padding: "0" }}>
        <div className="reviora-header" style={{ textAlign: "center", padding: "28px 20px" }}>
          <h2 className="reviora-main-heading" style={{ fontSize: "20px", justifyContent: "center", marginBottom: "8px" }}>
            Write a Review
          </h2>
          <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "#64748b" }}>
            Share your verified shopping experience
          </p>
          <div style={{ marginBottom: "16px" }}>{renderStars(5, 22)}</div>
          <button
            type="button"
            className="reviora-write-btn"
            style={{
              maxWidth: "240px",
              margin: "0 auto",
              backgroundColor: settings.buttonColor || buttonColor,
              color: settings.buttonTextColor || buttonTextColor,
            }}
          >
            <svg viewBox="0 0 24 24" style={{ width: "16px", height: "16px", fill: "currentColor" }}>
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
            </svg>
            {settings.buttonText || "Write a Review"}
          </button>
        </div>
      </div>
    );
  }

  // 5. STAR RATING BADGE
  if (widgetId === "star_rating") {
    const alignment = settings.alignment || "left";
    return (
      <div style={{ padding: "40px 20px", display: "flex", justifyContent: alignment === "center" ? "center" : alignment === "right" ? "flex-end" : "flex-start" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "#ffffff", padding: "10px 18px", borderRadius: "8px", border: "1px solid #e2e8f0", boxShadow: "0 2px 6px rgba(0,0,0,0.04)" }}>
          {renderStars(4.9, 18)}
          {settings.showNumericRating !== false && (
            <span style={{ fontSize: "15px", fontWeight: "700", color: textColor }}>4.9</span>
          )}
          {settings.showReviewCount !== false && (
            <span style={{ fontSize: "13px", color: "#64748b" }}>(128 reviews)</span>
          )}
        </div>
      </div>
    );
  }

  // 6. TRUST & CHECKOUT BADGE
  if (widgetId === "trust_badge") {
    const alignment = settings.alignment || "center";
    const rawTemplate = settings.buttonText || settings.badgeText || "{rating}/5 from {count}+ Verified Buyers";
    const liveRating = String(avgScore || "4.9");
    const liveCount = Number(totalReviewsCount || 1280).toLocaleString();

    const displayText = rawTemplate
      .replace(/{rating}/g, liveRating)
      .replace(/{count}/g, liveCount);

    const showVerified = settings.showVerifiedBadge !== false;
    const badgeAccentColor = settings.accentColor || textColor;

    return (
      <div style={{ padding: "40px 20px", display: "flex", justifyContent: alignment === "center" ? "center" : alignment === "right" ? "flex-end" : "flex-start" }}>
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "10px",
          padding: "10px 20px",
          borderRadius: "999px",
          background: settings.bgColor || "#f8fafc",
          border: `1px solid ${settings.borderColor || "#e2e8f0"}`,
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        }}>
          <span style={{ display: "inline-flex", gap: "2px" }}>
            {renderStars(Number(liveRating) || 5, 15)}
          </span>
          <span style={{ fontSize: "14px", fontWeight: "700", color: badgeAccentColor }}>
            {displayText}
          </span>
          {showVerified && (
            <span style={{
              color: badgeColor,
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "12px",
              fontWeight: "700",
              background: `${badgeColor}15`,
              padding: "3px 8px",
              borderRadius: "999px",
            }}>
              <svg viewBox="0 0 24 24" style={{ width: "12px", height: "12px", fill: "currentColor" }}>
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
              </svg>
              100% Verified
            </span>
          )}
        </div>
      </div>
    );
  }

  // 7. FLOATING REVIEWS TAB
  if (widgetId === "floating_tab") {
    const pos = settings.position || "bottom-right";
    const tabBg = settings.bgColor || "#0F172A";
    const tabTextCol = settings.textColor || "#FFFFFF";
    return (
      <div style={{ position: "relative", minHeight: "420px", background: "#f8fafc", borderRadius: "12px", overflow: "hidden", border: "1px solid #e2e8f0", padding: "24px" }}>
        {/* Simulated storefront background page */}
        <div style={{ opacity: 0.5, pointerEvents: "none" }}>
          <div style={{ height: "18px", width: "160px", background: "#cbd5e1", borderRadius: "4px", marginBottom: "16px" }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div style={{ height: "180px", background: "#e2e8f0", borderRadius: "8px" }} />
            <div>
              <div style={{ height: "24px", width: "80%", background: "#cbd5e1", borderRadius: "4px", marginBottom: "12px" }} />
              <div style={{ height: "16px", width: "40%", background: "#e2e8f0", borderRadius: "4px", marginBottom: "16px" }} />
              <div style={{ height: "40px", width: "60%", background: "#cbd5e1", borderRadius: "6px" }} />
            </div>
          </div>
        </div>

        {/* Floating Tab Button */}
        <div
          style={{
            position: "absolute",
            bottom: pos.includes("bottom") ? "24px" : "50%",
            right: pos.includes("right") ? "24px" : undefined,
            left: pos.includes("left") ? "24px" : undefined,
            transform: pos.startsWith("mid") ? "translateY(50%)" : undefined,
            background: tabBg,
            color: tabTextCol,
            padding: "10px 18px",
            borderRadius: "999px",
            boxShadow: "0 6px 20px rgba(0,0,0,0.18)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontWeight: "700",
            fontSize: "13px",
            zIndex: 10,
          }}
        >
          <span style={{ color: starColor }}>★</span>
          <span>{settings.tabText || "Reviews"}</span>
          <span style={{ background: "rgba(255,255,255,0.2)", padding: "2px 6px", borderRadius: "10px", fontSize: "11px" }}>128</span>
        </div>

        {/* Slideout Drawer Preview Mock */}
        <div
          style={{
            position: "absolute",
            top: "16px",
            bottom: "16px",
            right: pos.includes("right") ? "16px" : undefined,
            left: pos.includes("left") ? "16px" : undefined,
            width: "300px",
            background: "#ffffff",
            borderRadius: "12px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
            border: "1px solid #e2e8f0",
            display: "flex",
            flexDirection: "column",
            padding: "16px",
            zIndex: 5,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: "10px", marginBottom: "12px" }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: "14px", color: textColor }}>Customer Reviews</div>
              <div style={{ fontSize: "11px", color: "#64748b" }}>★ 4.9 (128 reviews)</div>
            </div>
            <button type="button" style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: "16px", color: "#94a3b8" }}>&times;</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ background: "#f8fafc", padding: "10px", borderRadius: "8px", border: "1px solid #f1f5f9" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <span style={{ fontWeight: 700, fontSize: "12px" }}>Sarah J.</span>
                <span style={{ fontSize: "10px", color: badgeColor, fontWeight: 700 }}>✓ Verified</span>
              </div>
              <div style={{ marginBottom: "4px" }}>{renderStars(5, 11)}</div>
              <p style={{ margin: 0, fontSize: "11px", color: "#475569", lineHeight: "1.3" }}>Exceeded all expectations! Superior quality.</p>
            </div>
            <div style={{ background: "#f8fafc", padding: "10px", borderRadius: "8px", border: "1px solid #f1f5f9" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <span style={{ fontWeight: 700, fontSize: "12px" }}>Marcus V.</span>
                <span style={{ fontSize: "10px", color: badgeColor, fontWeight: 700 }}>✓ Verified</span>
              </div>
              <div style={{ marginBottom: "4px" }}>{renderStars(5, 11)}</div>
              <p style={{ margin: 0, fontSize: "11px", color: "#475569", lineHeight: "1.3" }}>Lightning fast delivery and great support!</p>
            </div>
          </div>
          <button
            type="button"
            style={{
              marginTop: "12px",
              background: tabBg,
              color: tabTextCol,
              border: "none",
              borderRadius: "8px",
              padding: "8px 12px",
              fontWeight: 700,
              fontSize: "12px",
              cursor: "pointer",
              width: "100%",
            }}
          >
            Write a Review
          </button>
        </div>
      </div>
    );
  }

  // 8. SOCIAL PROOF REVIEW POPUP TOASTS
  if (widgetId === "review_popups") {
    const pos = settings.position || "bottom-left";
    const toastReview = effectiveReviews[0] || AUTHENTIC_LIFESTYLE_MEDIA[0];
    return (
      <div style={{ position: "relative", minHeight: "360px", background: "#f8fafc", borderRadius: "12px", overflow: "hidden", border: "1px solid #e2e8f0", padding: "24px" }}>
        {/* Store background simulation */}
        <div style={{ opacity: 0.4, pointerEvents: "none" }}>
          <div style={{ height: "20px", width: "180px", background: "#cbd5e1", borderRadius: "4px", marginBottom: "16px" }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
            {[1, 2, 3].map((n) => (
              <div key={n} style={{ height: "130px", background: "#e2e8f0", borderRadius: "8px" }} />
            ))}
          </div>
        </div>

        {/* Floating Popup Toast */}
        <div
          style={{
            position: "absolute",
            bottom: "20px",
            left: pos === "bottom-left" ? "20px" : undefined,
            right: pos === "bottom-right" ? "20px" : undefined,
            background: "#ffffff",
            borderRadius: "14px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
            border: "1px solid #e2e8f0",
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            maxWidth: "380px",
            zIndex: 10,
          }}
        >
          <img
            src={toastReview.productImage || toastReview.mediaUrl}
            alt={toastReview.productTitle}
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "10px",
              objectFit: "cover",
              flexShrink: 0,
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px", marginBottom: "2px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <img
                  src={toastReview.avatar}
                  alt={toastReview.authorName}
                  style={{ width: "16px", height: "16px", borderRadius: "50%", objectFit: "cover" }}
                />
                <span style={{ fontSize: "12px", fontWeight: "700", color: textColor, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {toastReview.authorName}
                </span>
              </div>
              <span style={{ color: badgeColor, fontSize: "10px", fontWeight: "700" }}>✓ Verified</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
              {renderStars(toastReview.rating, 11)}
              <span style={{ fontSize: "10px", color: "#94a3b8" }}>{toastReview.date}</span>
            </div>
            <div style={{ fontSize: "11px", color: "#475569", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontStyle: "italic" }}>
              &quot;{toastReview.body}&quot;
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 9. UGC PHOTO & VIDEO WALL
  if (widgetId === "ugc_media_grid") {
    const cols = Number(settings.columns || 4);
    return (
      <div className="reviora-carousel-block" style={{ margin: "0", padding: "0" }}>
        <div className="reviora-carousel-header" style={{ marginBottom: "20px" }}>
          <h2 className="reviora-carousel-title" style={{ fontSize: "20px", color: textColor }}>
            {settings.heading || "Customer Photos & Videos"}
          </h2>
          <p className="reviora-carousel-sub" style={{ fontSize: "13px" }}>
            {settings.subheading || "Real photos shared by verified customers"}
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap: "14px",
          }}
        >
          {effectiveReviews.slice(0, cols).map((item, idx) => (
            <div
              key={idx}
              style={{
                position: "relative",
                borderRadius: "14px",
                overflow: "hidden",
                aspectRatio: "1 / 1",
                boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
                background: "#0f172a",
                cursor: "pointer",
              }}
            >
              <img
                src={item.mediaUrl}
                alt={item.authorName}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
              {item.isVideo && (
                <div
                  style={{
                    position: "absolute",
                    top: "10px",
                    right: "10px",
                    background: "rgba(15, 23, 42, 0.75)",
                    backdropFilter: "blur(6px)",
                    color: "#ffffff",
                    padding: "3px 8px",
                    borderRadius: "16px",
                    fontSize: "10px",
                    fontWeight: "700",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <span style={{ fontSize: "9px" }}>▶</span> {item.duration || "0:45"}
                </div>
              )}
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: "16px 10px 10px 10px",
                  background: "linear-gradient(to top, rgba(15,23,42,0.92) 0%, rgba(15,23,42,0.45) 60%, transparent 100%)",
                  color: "#ffffff",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <img
                      src={item.avatar}
                      alt={item.authorName}
                      style={{ width: "18px", height: "18px", borderRadius: "50%", objectFit: "cover", border: "1px solid rgba(255,255,255,0.4)" }}
                    />
                    <span style={{ fontSize: "11px", fontWeight: "700", textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>
                      {item.authorName}
                    </span>
                  </div>
                  <span>{renderStars(item.rating, 10)}</span>
                </div>
                <div style={{ fontSize: "9px", opacity: 0.9, marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.body || item.title}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 10. ALL REVIEWS DEDICATED PAGE
  if (widgetId === "all_reviews_page") {
    return (
      <div
        className="reviora-widget-container"
        style={{
          maxWidth: "100%",
          width: "100%",
          margin: "0",
          padding: "0",
          boxSizing: "border-box",
          "--reviora-star": starColor,
          "--reviora-primary": settings.accentColor || accentColor,
          "--reviora-text-main": textColor,
          "--reviora-accent": badgeColor,
        }}
      >
        <div className="reviora-header" style={{ textAlign: "center", padding: "32px 24px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: "800", color: textColor, margin: "0 0 8px 0" }}>
            {settings.heading || "All Store Reviews"}
          </h1>
          <p style={{ margin: "0 0 20px 0", fontSize: "13px", color: "#64748b" }}>
            {settings.subheading || "Verified customer feedback from across our entire catalog"}
          </p>

          <div style={{ display: "inline-flex", alignItems: "center", gap: "16px", background: "#f8fafc", padding: "10px 20px", borderRadius: "999px", border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "26px", fontWeight: "800", color: textColor }}>{avgScore}</span>
              <div style={{ textAlign: "left" }}>
                <div>{renderStars(Number(avgScore) || 5, 14)}</div>
                <div style={{ fontSize: "11px", color: "#64748b" }}>{totalReviewsCount} verified reviews</div>
              </div>
            </div>
            <div style={{ width: "1px", height: "24px", background: "#cbd5e1" }} />
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: badgeColor, fontWeight: 700, fontSize: "12px" }}>
              <svg viewBox="0 0 24 24" style={{ width: "14px", height: "14px", fill: "currentColor" }}>
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
              </svg>
              100% Certified Store
            </div>
          </div>
        </div>

        <div className="reviora-list" style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "0 16px 24px" }}>
          {effectiveReviews.slice(0, 3).map((rev) => (
            <div key={rev.id} className="reviora-card" style={{ background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "18px" }}>
              <div className="reviora-card-top" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                <div className="reviora-author-meta" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <img
                    src={rev.avatar}
                    alt={rev.authorName}
                    style={{ width: "38px", height: "38px", borderRadius: "50%", objectFit: "cover" }}
                  />
                  <div className="reviora-author-details">
                    <div className="reviora-author-name-row" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span className="reviora-author" style={{ fontWeight: 700, fontSize: "14px" }}>{rev.authorName}</span>
                      <span className="reviora-verified-badge" style={{ color: badgeColor, background: `${badgeColor}15`, padding: "2px 6px", borderRadius: "4px", fontSize: "11px", fontWeight: 600 }}>Verified</span>
                    </div>
                    <div>{renderStars(rev.rating, 13)}</div>
                  </div>
                </div>
                <span className="reviora-date" style={{ fontSize: "12px", color: "#94a3b8" }}>{rev.date}</span>
              </div>
              <h3 className="reviora-card-title" style={{ fontSize: "15px", fontWeight: 700, margin: "0 0 6px 0", color: textColor }}>{rev.title}</h3>
              <div className="reviora-card-body" style={{ fontSize: "13px", color: "#475569", lineHeight: "1.5" }}>{rev.body}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 11. PRODUCT Q&A WIDGET
  if (widgetId === "qa_widget") {
    return (
      <div className="reviora-widget-container" style={{ margin: "0", padding: "0" }}>
        <div className="reviora-header" style={{ padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "18px" }}>
            <div>
              <h2 className="reviora-main-heading" style={{ fontSize: "20px", color: textColor }}>
                {settings.heading || "Customer Questions & Answers"}
              </h2>
              <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#64748b" }}>
                {settings.subheading || "Have questions? Ask our verified community or store staff."}
              </p>
            </div>
            <button
              type="button"
              className="reviora-write-btn"
              style={{
                backgroundColor: settings.accentColor || accentColor,
                color: "#ffffff",
                padding: "8px 16px",
                fontSize: "13px",
              }}
            >
              Ask a Question
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {[
              {
                q: "How does the sizing run for this product?",
                asker: "Jessica T. • Verified Buyer",
                a: "It fits true to size! If you prefer a relaxed fit, we recommend ordering one size up.",
                answerer: "Store Team • 1 day ago",
              },
              {
                q: "Is this item covered under the 1-year warranty?",
                asker: "David M.",
                a: "Yes, all our products come with a full 1-year manufacturer warranty including free replacements.",
                answerer: "Store Team • 3 days ago",
              },
            ].map((item, idx) => (
              <div key={idx} style={{ background: "#f8fafc", borderRadius: "10px", padding: "14px 16px", border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "8px" }}>
                  <span style={{ background: "#0ea5e9", color: "#fff", borderRadius: "4px", padding: "2px 6px", fontSize: "10px", fontWeight: "800" }}>Q</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "13px", color: textColor }}>{item.q}</div>
                    <div style={{ fontSize: "11px", color: "#94a3b8" }}>{item.asker}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", paddingLeft: "12px", borderLeft: "2px solid #e2e8f0" }}>
                  <span style={{ background: "#10b981", color: "#fff", borderRadius: "4px", padding: "2px 6px", fontSize: "10px", fontWeight: "800" }}>A</span>
                  <div>
                    <div style={{ fontSize: "12px", color: "#334155", lineHeight: "1.4" }}>{item.a}</div>
                    <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>{item.answerer}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 5. STANDARD PRODUCT REVIEW WIDGET (review_widget) EXACT FRONTEND LAYOUT
  const title = settings.headerTitle || settings.heading || "Customer Reviews";
  const sub = settings.subheading || "Real reviews from verified buyers";
  const showVerified = settings.showVerifiedBadge !== false;
  const showBreakdown = settings.showBreakdown !== false;
  const showFilter = settings.showRatingFilter !== false;
  const showMedia = settings.showMediaUpload !== false;

  return (
    <div
      className="reviora-widget-container"
      style={{
        maxWidth: "100%",
        width: "100%",
        margin: "0",
        padding: "0",
        boxSizing: "border-box",
        "--reviora-star": starColor,
        "--reviora-primary": settings.buttonColor || accentColor,
        "--reviora-text-main": textColor,
        "--reviora-accent": badgeColor,
      }}
    >
      {/* 1. Exact Frontend Summary Header Card */}
      <div className="reviora-header">
        <div className="reviora-title-bar">
          <h2 className="reviora-main-heading">
            {title}
            {showVerified && (
              <span className="reviora-trust-pill">
                <svg viewBox="0 0 24 24">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
                </svg>
                Verified Feedback
              </span>
            )}
          </h2>
          {sub && (
            <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#64748b", width: "100%" }}>
              {sub}
            </p>
          )}
        </div>

        <div className="reviora-summary-grid">
          {/* Average Rating Hero Box */}
          <div className="reviora-avg-box">
            {settings.showNumericRating !== false && (
              <div className="reviora-avg-number">4.9</div>
            )}
            <div className="reviora-stars">{renderStars(4.9, 20)}</div>
            {settings.showReviewCount !== false && (
              <div className="reviora-subtext">Based on 128 verified reviews</div>
            )}
          </div>

          {/* Distribution Breakdown Bars */}
          {showBreakdown ? (
            <div className="reviora-bars">
              {[
                { star: 5, pct: 85, count: 109 },
                { star: 4, pct: 10, count: 13 },
                { star: 3, pct: 3, count: 4 },
                { star: 2, pct: 1, count: 1 },
                { star: 1, pct: 1, count: 1 },
              ].map((row) => (
                <div key={row.star} className="reviora-bar-row">
                  <span className="reviora-bar-star-label">{row.star}★</span>
                  <div className="reviora-bar-track">
                    <div
                      className="reviora-bar-fill"
                      style={{ width: `${row.pct}%`, backgroundColor: starColor }}
                    />
                  </div>
                  <span className="reviora-bar-count">{row.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div />
          )}

          {/* Header Action CTA Button */}
          <div className="reviora-cta-box">
            <button
              type="button"
              className="reviora-write-btn"
              style={{
                backgroundColor: settings.buttonColor || accentColor,
                color: settings.buttonTextColor || "#ffffff",
              }}
            >
              <svg viewBox="0 0 24 24">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
              </svg>
              <span>{settings.buttonText || "Write a Review"}</span>
            </button>
            <span className="reviora-cta-caption">Takes only 30 seconds</span>
          </div>
        </div>
      </div>

      {/* 2. Controls Bar: Filter Pills, Search & Sort */}
      {showFilter && (
        <div className="reviora-controls">
          <div className="reviora-filter-group">
            <button
              type="button"
              className="reviora-filter-pill is-active"
              style={{
                backgroundColor: settings.buttonColor || accentColor,
                borderColor: settings.buttonColor || accentColor,
                color: "#ffffff",
              }}
            >
              All Reviews <span className="reviora-filter-count">(128)</span>
            </button>
            {showMedia && (
              <button type="button" className="reviora-filter-pill">
                📷 With Photos/Videos <span className="reviora-filter-count">(42)</span>
              </button>
            )}
            <button type="button" className="reviora-filter-pill">
              5 ★ <span className="reviora-filter-count">(109)</span>
            </button>
            <button type="button" className="reviora-filter-pill">
              4 ★ <span className="reviora-filter-count">(13)</span>
            </button>
            <button type="button" className="reviora-filter-pill">
              3 ★ <span className="reviora-filter-count">(4)</span>
            </button>
            <button type="button" className="reviora-filter-pill">
              2 ★ <span className="reviora-filter-count">(1)</span>
            </button>
            <button type="button" className="reviora-filter-pill">
              1 ★ <span className="reviora-filter-count">(1)</span>
            </button>
          </div>

          <div className="reviora-search-sort-group">
            <div className="reviora-search-wrap">
              <svg className="reviora-search-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
              </svg>
              <input
                type="text"
                className="reviora-search-input"
                placeholder="Search reviews..."
                readOnly
              />
            </div>

            <select className="reviora-sort-select" aria-label="Sort Reviews" defaultValue="newest">
              <option value="newest">Most Recent</option>
              <option value="highest">Highest Rating</option>
              <option value="lowest">Lowest Rating</option>
              <option value="helpful">Most Helpful</option>
            </select>
          </div>
        </div>
      )}

      {/* 3. Reviews List & Authentic Cards */}
      <div
        className="reviora-list"
        style={{
          display: layout === "grid" ? "grid" : "flex",
          gridTemplateColumns: layout === "grid" ? "repeat(auto-fit, minmax(280px, 1fr))" : undefined,
          flexDirection: layout === "grid" ? undefined : "column",
          gap: "16px",
        }}
      >
        {effectiveReviews.slice(0, layout === "grid" ? 4 : 2).map((rev) => (
          <div key={rev.id} className="reviora-card">
            <div className="reviora-card-top">
              <div className="reviora-author-meta">
                {rev.avatar ? (
                  <img
                    src={rev.avatar}
                    alt={rev.authorName}
                    style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover" }}
                  />
                ) : (
                  <div className="reviora-avatar">
                    {rev.authorName ? rev.authorName.split(" ").map((n) => n[0]).join("").slice(0, 2) : "SJ"}
                  </div>
                )}
                <div className="reviora-author-details">
                  <div className="reviora-author-name-row">
                    <span className="reviora-author">{rev.authorName}</span>
                    {showVerified && (
                      <span
                        className="reviora-verified-badge"
                        style={{
                          color: badgeColor,
                          background: `${badgeColor}15`,
                          borderColor: `${badgeColor}40`,
                        }}
                      >
                        <svg viewBox="0 0 24 24">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                        </svg>
                        Verified Buyer
                      </span>
                    )}
                  </div>
                  <div className="reviora-card-stars-row">
                    {renderStars(rev.rating, 15)}
                  </div>
                </div>
              </div>
              <span className="reviora-date">{rev.date}</span>
            </div>

            <h3 className="reviora-card-title">{rev.title}</h3>
            <div className="reviora-card-body">{rev.body}</div>

            {showMedia && rev.mediaList && rev.mediaList.length > 0 && (
              <div className="reviora-media-row" style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                {rev.mediaList.slice(0, 2).map((item, mIdx) => (
                  <div
                    key={mIdx}
                    className="reviora-media-item"
                    style={{
                      width: "80px",
                      height: "80px",
                      borderRadius: "8px",
                      overflow: "hidden",
                      position: "relative",
                      border: "1px solid #e2e8f0",
                      background: "#f1f5f9",
                    }}
                  >
                    <img
                      src={item.url}
                      alt="Review attachment"
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                    {item.mediaType === "VIDEO" && (
                      <span
                        style={{
                          position: "absolute",
                          bottom: "4px",
                          right: "4px",
                          background: "rgba(0,0,0,0.7)",
                          color: "#fff",
                          fontSize: "10px",
                          padding: "2px 5px",
                          borderRadius: "4px",
                        }}
                      >
                        ▶ Video
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="reviora-card-footer">
              <button type="button" className="reviora-helpful-btn">
                <svg viewBox="0 0 24 24">
                  <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z" />
                </svg>
                <span>Helpful ({rev.helpfulCount})</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
