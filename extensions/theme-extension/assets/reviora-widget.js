(() => {
  // If the app embed block is disabled in the theme, do not initialize or display widgets
  if (!window.__REVIORA_APP_EMBED_ENABLED__) {
    const hideAll = () => {
      document.querySelectorAll(
        ".reviora-app-block, .reviora-star-badge-block, reviora-reviews-widget, reviora-reviews-carousel, reviora-floating-tab, reviora-review-popups, reviora-ugc-media-grid, reviora-all-reviews-page, reviora-qa-widget"
      ).forEach((el) => el.style.setProperty("display", "none", "important"));
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", hideAll);
    } else {
      hideAll();
    }
    return;
  }

  // If the app embed block is disabled in the theme, do not initialize or display widgets
  if (!window.__REVIORA_APP_EMBED_ENABLED__) {
    const hideAll = () => {
      document.querySelectorAll(
        ".reviora-app-block, .reviora-star-badge-block, reviora-reviews-widget, reviora-reviews-carousel, reviora-floating-tab, reviora-review-popups, reviora-ugc-media-grid, reviora-all-reviews-page, reviora-qa-widget"
      ).forEach((el) => el.style.setProperty("display", "none", "important"));
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", hideAll);
    } else {
      hideAll();
    }
    return;
  }
  // Global Lightbox Utility
  class RevioraLightbox {
    constructor() {
      this.el = null;
      this.currentIndex = 0;
      this.mediaList = [];
      this.init();
    }

    init() {
      let existing = document.getElementById("reviora-global-lightbox");
      if (existing) {
        this.el = existing;
        return;
      }

      const backdrop = document.createElement("div");
      backdrop.id = "reviora-global-lightbox";
      backdrop.className = "reviora-lightbox-backdrop is-hidden";
      backdrop.innerHTML = `
        <div class="reviora-lightbox-modal">
          <button type="button" class="reviora-lightbox-close-btn" aria-label="Close lightbox">&times;</button>
          <div class="reviora-lightbox-content">
            <button type="button" class="reviora-lightbox-nav reviora-lightbox-prev" aria-label="Previous">&lsaquo;</button>
            <div id="reviora-lightbox-media-container" style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;"></div>
            <button type="button" class="reviora-lightbox-nav reviora-lightbox-next" aria-label="Next">&rsaquo;</button>
          </div>
          <div class="reviora-lightbox-caption" id="reviora-lightbox-caption">
            <div id="reviora-lightbox-author" style="font-weight:600;"></div>
            <div id="reviora-lightbox-counter" style="color:#94a3b8;font-size:12px;"></div>
          </div>
        </div>
      `;

      document.body.appendChild(backdrop);
      this.el = backdrop;

      // Event listeners
      backdrop.querySelector(".reviora-lightbox-close-btn").addEventListener("click", () => this.close());
      backdrop.querySelector(".reviora-lightbox-prev").addEventListener("click", (e) => {
        e.stopPropagation();
        this.prev();
      });
      backdrop.querySelector(".reviora-lightbox-next").addEventListener("click", (e) => {
        e.stopPropagation();
        this.next();
      });

      backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) this.close();
      });

      document.addEventListener("keydown", (e) => {
        if (!this.el || this.el.classList.contains("is-hidden")) return;
        if (e.key === "Escape") this.close();
        if (e.key === "ArrowLeft") this.prev();
        if (e.key === "ArrowRight") this.next();
      });
    }

    open(mediaList, startIndex = 0, authorName = "") {
      this.mediaList = mediaList || [];
      this.currentIndex = startIndex >= 0 && startIndex < this.mediaList.length ? startIndex : 0;
      this.authorName = authorName;
      this.render();
      this.el.classList.remove("is-hidden");
      document.body.classList.add("reviora-modal-open");
    }

    close() {
      if (this.el) {
        this.el.classList.add("is-hidden");
        const container = this.el.querySelector("#reviora-lightbox-media-container");
        if (container) container.innerHTML = "";
      }
      document.body.classList.remove("reviora-modal-open");
    }

    prev() {
      if (this.mediaList.length <= 1) return;
      this.currentIndex = (this.currentIndex - 1 + this.mediaList.length) % this.mediaList.length;
      this.render();
    }

    next() {
      if (this.mediaList.length <= 1) return;
      this.currentIndex = (this.currentIndex + 1) % this.mediaList.length;
      this.render();
    }

    render() {
      const container = this.el.querySelector("#reviora-lightbox-media-container");
      const authorEl = this.el.querySelector("#reviora-lightbox-author");
      const counterEl = this.el.querySelector("#reviora-lightbox-counter");
      const prevBtn = this.el.querySelector(".reviora-lightbox-prev");
      const nextBtn = this.el.querySelector(".reviora-lightbox-next");

      if (this.mediaList.length <= 1) {
        prevBtn.style.display = "none";
        nextBtn.style.display = "none";
      } else {
        prevBtn.style.display = "flex";
        nextBtn.style.display = "flex";
      }

      const item = this.mediaList[this.currentIndex];
      if (!item) return;

      const isVideo = item.mediaType === "VIDEO" || /\.(mp4|webm|mov|ogg)($|\?)/i.test(item.url);
      if (isVideo) {
        container.innerHTML = `<video src="${item.url}" class="reviora-lightbox-video" controls autoplay playsinline></video>`;
      } else {
        container.innerHTML = `<img src="${item.url}" class="reviora-lightbox-img" alt="Review Media" />`;
      }

      authorEl.textContent = this.authorName ? `Photo by ${this.authorName}` : "Customer Media";
      counterEl.textContent = `${this.currentIndex + 1} of ${this.mediaList.length}`;
    }
  }

  const globalLightbox = new RevioraLightbox();

  // Helper: Render SVG Stars
  function renderStarsSvg(rating, starColor = "#FFB800", size = 16) {
    const fullStars = Math.floor(rating);
    const hasHalf = rating - fullStars >= 0.5;
    let html = `<div style="display:inline-flex;align-items:center;gap:2px;">`;

    for (let i = 1; i <= 5; i++) {
      let fill = "#E2E8F0";
      if (i <= fullStars) {
        fill = starColor;
      } else if (i === fullStars + 1 && hasHalf) {
        fill = starColor; // Or half star gradient
      }
      html += `
        <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      `;
    }
    html += `</div>`;
    return html;
  }

  // Helper: Sanitize API URL so inputs like /app or /api are stripped to the root domain origin
  function cleanBaseUrl(raw) {
    if (!raw || typeof raw !== "string") return "";
    let trimmed = raw.trim().replace(/\/+$/, "");
    try {
      if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        const u = new URL(trimmed);
        return u.origin;
      }
    } catch {
      // ignore
    }
    return trimmed.replace(/\/app(\/api)?$/i, "").replace(/\/api$/i, "");
  }

  // Security Helper: Escape HTML to prevent XSS when rendering user reviews/Q&A
  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // =========================================================
  // MAIN REVIEWS WIDGET CUSTOM ELEMENT
  // =========================================================
  class RevioraReviewsWidget extends HTMLElement {
    constructor() {
      super();
      this.shop =
        this.getAttribute("data-shop") ||
        window.Shopify?.shop ||
        (window.location.hostname.includes("myshopify.com") ? window.location.hostname : "");
      // Resolve product handle/id (prefer handle, fallback to URL path if on product page)
      let pId =
        this.getAttribute("data-product-handle") ||
        this.getAttribute("data-product-id") ||
        "";
      if (!pId) {
        const match = window.location.pathname.match(/\/products\/([^/?#]+)/);
        if (match && match[1]) {
          pId = decodeURIComponent(match[1]);
        }
      }
      this.productId = pId;
      this.productHandle = this.getAttribute("data-product-handle") || (pId !== "all" ? pId : "");
      this.productTitle = this.getAttribute("data-product-title") || "";
      this.starColor = this.getAttribute("data-star-color") || "#FFB800";
      this.accentColor = this.getAttribute("data-accent-color") || "#0F172A";
      this.apiUrl =
        cleanBaseUrl(this.getAttribute("data-api-url")) ||
        window.RevioraApiUrl ||
        "https://reviora-ef66.onrender.com";

      // State
      this.rawReviews = [];
      this.filteredReviews = [];
      this.stats = { total: 0, averageRating: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, photoUploadsEnabled: true };
      this.selectedFilterRating = null; // null for all, or 1..5
      this.selectedFilterMedia = false;
      this.searchKeyword = "";
      this.sortOption = "newest";
      this.modalEl = null;
      this.currentStep = 1;
      this.uploadedMedia = [];
      this.photoUploadsEnabled = true;
    }

    connectedCallback() {
      const attrColor = this.getAttribute("data-star-color");
      if (attrColor && attrColor.trim() && attrColor !== "undefined") {
        this.starColor = attrColor.trim();
      }
      if (this.apiUrl) {
        window.RevioraApiUrl = this.apiUrl;
      }
      this.renderLoading();
      this.fetchReviews();
    }

    disconnectedCallback() {
      if (this.modalEl && this.modalEl.parentNode) {
        this.modalEl.parentNode.removeChild(this.modalEl);
        this.modalEl = null;
      }
      document.body.classList.remove("reviora-modal-open");
    }

    renderLoading() {
      this.innerHTML = `
        <div class="reviora-widget-container" id="reviora-widget-container">
          <div style="text-align:center;padding:40px;color:#64748b;font-size:14px;">
            <div style="font-size:24px;margin-bottom:8px;">✨</div>
            Loading verified customer reviews...
          </div>
        </div>
      `;
    }

    async fetchReviews() {
      const shopParam = encodeURIComponent(this.shop || "");
      const productParam = encodeURIComponent(this.productId || "all");
      const base = this.apiUrl || "";
      const endpoint = `${base}/api/reviews?shop=${shopParam}&productId=${productParam}`;

      try {
        const res = await fetch(endpoint, {
          headers: { Accept: "application/json" },
        });

        if (!res.ok) throw new Error(`HTTP error ${res.status}`);

        const data = await res.json();
        this.rawReviews = data.reviews || [];
        this.stats = data.stats || { total: 0, averageRating: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
        this.photoUploadsEnabled = this.stats.photoUploadsEnabled !== false;
        this.applyFiltersAndSort();
        this.render();

        // Google Shopping & Rich Snippets (Schema.org JSON-LD) - Exclusively for PRO plan users
        if ((this.stats.isPro || this.stats.plan === "PRO") && Number(this.stats.total) > 0) {
          this.injectRichSnippetsJsonLd();
        }
      } catch (e) {
        console.warn("Reviora widget API fallback:", endpoint, e);
        this.rawReviews = [];
        this.stats = { total: 0, averageRating: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
        this.applyFiltersAndSort();
        this.render();
      }
    }

    injectRichSnippetsJsonLd() {
      if (!this.stats || Number(this.stats.total) <= 0) return;
      const cleanProdId = String(this.productId || "product").replace(/[^a-zA-Z0-9_-]/g, "");
      const scriptId = `reviora-jsonld-${cleanProdId}`;
      if (document.getElementById(scriptId)) return;

      const productTitle = this.productTitle || (this.getAttribute("data-product-title") || "").trim() || document.title.split(/[-|]/)[0].trim() || "Product";
      const currentUrl = window.location.href.split("?")[0];
      const avg = Number(this.stats.averageRating) || 5;
      const count = Number(this.stats.total) || 0;

      // Extract top published reviews for rich Google results
      const reviewsJson = (this.rawReviews || []).slice(0, 10).map((r) => ({
        "@type": "Review",
        name: r.title || "Customer Review",
        reviewBody: r.body || "",
        datePublished: r.createdAt ? new Date(r.createdAt).toISOString().split("T")[0] : undefined,
        reviewRating: {
          "@type": "Rating",
          ratingValue: String(r.rating || 5),
          bestRating: "5",
          worstRating: "1",
        },
        author: {
          "@type": "Person",
          name: r.authorName || "Verified Buyer",
        },
      }));

      const schemaData = {
        "@context": "https://schema.org",
        "@type": "Product",
        name: productTitle,
        url: currentUrl,
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: avg.toFixed(1),
          reviewCount: String(count),
          bestRating: "5",
          worstRating: "1",
        },
        ...(reviewsJson.length > 0 ? { review: reviewsJson } : {}),
      };

      const script = document.createElement("script");
      script.id = scriptId;
      script.type = "application/ld+json";
      script.textContent = JSON.stringify(schemaData, null, 2);
      document.head.appendChild(script);
    }

    applyFiltersAndSort() {
      let list = [...this.rawReviews];

      // Star rating filter
      if (this.selectedFilterRating !== null) {
        list = list.filter((r) => Math.round(Number(r.rating)) === this.selectedFilterRating);
      }

      // Media filter
      if (this.selectedFilterMedia) {
        list = list.filter((r) => r.media && r.media.length > 0);
      }

      // Search keyword filter
      if (this.searchKeyword.trim()) {
        const q = this.searchKeyword.trim().toLowerCase();
        list = list.filter((r) => {
          return (
            (r.title && r.title.toLowerCase().includes(q)) ||
            (r.body && r.body.toLowerCase().includes(q)) ||
            (r.authorName && r.authorName.toLowerCase().includes(q))
          );
        });
      }

      // Sorting
      if (this.sortOption === "highest") {
        list.sort((a, b) => b.rating - a.rating);
      } else if (this.sortOption === "lowest") {
        list.sort((a, b) => a.rating - b.rating);
      } else if (this.sortOption === "helpful") {
        list.sort((a, b) => (b.helpfulCount || 0) - (a.helpfulCount || 0));
      } else {
        list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      }

      this.filteredReviews = list;
    }

    getRatingLabel(rating) {
      switch (rating) {
        case 5: return "5 Stars — Loved it! Outstanding";
        case 4: return "4 Stars — Very Good";
        case 3: return "3 Stars — Average / It's OK";
        case 2: return "2 Stars — Not great / Disappointed";
        case 1: return "1 Star — Terrible experience";
        default: return `${rating} Stars`;
      }
    }

    renderMediaRow(review) {
      if (!review.media || review.media.length === 0) return "";

      const items = review.media.map((m, idx) => {
        const isVideo = m.mediaType === "VIDEO" || (m.url && /\.(mp4|webm|mov|ogg)($|\?)/i.test(m.url));
        return `
          <div class="reviora-media-item" data-media-idx="${idx}" data-review-id="${review.id}">
            ${isVideo
            ? `<video src="${m.url}" class="reviora-media-thumb" preload="metadata"></video><div class="reviora-video-badge">▶</div>`
            : `<img src="${m.url}" class="reviora-media-thumb" alt="Review photo" loading="lazy" />`
          }
          </div>
        `;
      }).join("");

      return `<div class="reviora-media-row">${items}</div>`;
    }

    renderReviewCard(r) {
      const initials = (r.authorName || "Customer")
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

      const dateStr = r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Recent";
      const isHelpfulVoted = localStorage.getItem(`reviora_voted_${r.id}`) === "true";

      const replyHtml = r.replies && r.replies.length > 0
        ? `
          <div class="reviora-reply-box">
            <div class="reviora-reply-header">
              <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14h2v2h-2zm0-10h2v8h-2z"/></svg>
              Response from Store Owner
            </div>
            <p class="reviora-reply-body">${escapeHtml(r.replies[0].body)}</p>
          </div>
        `
        : "";

      return `
        <div class="reviora-card" data-review-id="${r.id}">
          <div class="reviora-card-top">
            <div class="reviora-author-meta">
              <div class="reviora-avatar">${escapeHtml(initials)}</div>
              <div class="reviora-author-details">
                <div class="reviora-author-name-row">
                  <span class="reviora-author">${escapeHtml(r.authorName || "Verified Customer")}</span>
                  ${r.verified ? `
                    <span class="reviora-verified-badge">
                      <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                      Verified Buyer
                    </span>
                  ` : ""}
                </div>
                <div class="reviora-card-stars-row">
                  ${renderStarsSvg(r.rating, this.starColor, 15)}
                </div>
              </div>
            </div>
            <span class="reviora-date">${dateStr}</span>
          </div>

          ${r.title ? `<h3 class="reviora-card-title">${escapeHtml(r.title)}</h3>` : ""}
          <div class="reviora-card-body">${escapeHtml(r.body)}</div>

          ${this.renderMediaRow(r)}
          ${replyHtml}

          <div class="reviora-card-footer">
            <button type="button" class="reviora-helpful-btn ${isHelpfulVoted ? 'is-voted' : ''}" data-review-id="${r.id}" ${isHelpfulVoted ? 'disabled' : ''}>
              <svg viewBox="0 0 24 24"><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/></svg>
              <span>${isHelpfulVoted ? 'Helpful' : 'Helpful'} (${r.helpfulCount || 0})</span>
            </button>
          </div>
        </div>
      `;
    }

    render() {
      const stats = this.stats;
      const totalCount = Number(stats.total) || 0;
      const avg = Number(stats.averageRating) || 0;
      const dist = stats.distribution || {};
      const reviews = this.filteredReviews;

      // Distribution bars HTML with clickable filter
      const barsHtml = [5, 4, 3, 2, 1]
        .map((r) => {
          const count = Number(dist[r] || dist[String(r)] || 0);
          const pct = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
          const isActive = this.selectedFilterRating === r;
          return `
            <div class="reviora-bar-row ${isActive ? 'is-active' : ''}" data-filter-stars="${r}">
              <span class="reviora-bar-star-label">${r}★</span>
              <div class="reviora-bar-track">
                <div class="reviora-bar-fill" style="width: ${pct}%; background-color: ${this.starColor};"></div>
              </div>
              <span class="reviora-bar-count">${count}</span>
            </div>
          `;
        })
        .join("");

      // Filter pills
      const mediaCount = this.rawReviews.filter((r) => r.media && r.media.length > 0).length;

      // Active filter description
      let activeFilterDesc = "";
      if (this.selectedFilterRating !== null || this.selectedFilterMedia || this.searchKeyword) {
        const parts = [];
        if (this.selectedFilterRating !== null) parts.push(`${this.selectedFilterRating} Stars`);
        if (this.selectedFilterMedia) parts.push("With Photos/Videos");
        if (this.searchKeyword) parts.push(`"${this.searchKeyword}"`);
        activeFilterDesc = `Showing ${reviews.length} reviews matching ${parts.join(" + ")}`;
      }

      this.innerHTML = `
        <div class="reviora-widget-container" id="reviora-widget-container">
          <!-- Summary Header -->
          <div class="reviora-header">
            <div class="reviora-title-bar">
              <h2 class="reviora-main-heading">
                Customer Reviews
                <span class="reviora-trust-pill">
                  <svg viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>
                  Verified Feedback
                </span>
              </h2>
            </div>

            <div class="reviora-summary-grid">
              <div class="reviora-avg-box">
                <div class="reviora-avg-number">${avg > 0 ? avg.toFixed(1) : "0.0"}</div>
                <div class="reviora-stars">${renderStarsSvg(avg, this.starColor, 20)}</div>
                <div class="reviora-subtext">Based on ${totalCount} verified reviews</div>
              </div>

              <div class="reviora-bars">
                ${barsHtml}
              </div>

              <div class="reviora-cta-box">
                <button type="button" class="reviora-write-btn" id="reviora-open-form-btn">
                  <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                  Write a Review
                </button>
                <span class="reviora-cta-caption">Takes only 30 seconds</span>
              </div>
            </div>
          </div>

          <!-- Controls Bar: Filter Pills, Search, Sort -->
          <div class="reviora-controls">
            <div class="reviora-filter-group">
              <button type="button" class="reviora-filter-pill ${this.selectedFilterRating === null && !this.selectedFilterMedia ? 'is-active' : ''}" data-filter="all">
                All Reviews <span class="reviora-filter-count">(${totalCount})</span>
              </button>
              <button type="button" class="reviora-filter-pill ${this.selectedFilterMedia ? 'is-active' : ''}" data-filter="media">
                📷 With Photos/Videos <span class="reviora-filter-count">(${mediaCount})</span>
              </button>
              ${[5, 4, 3, 2, 1].map((star) => {
        const count = dist[star] || dist[String(star)] || 0;
        return `
                  <button type="button" class="reviora-filter-pill ${this.selectedFilterRating === star ? 'is-active' : ''}" data-filter="star-${star}">
                    ${star} ★ <span class="reviora-filter-count">(${count})</span>
                  </button>
                `;
      }).join("")}
            </div>

            <div class="reviora-search-sort-group">
              <div class="reviora-search-wrap">
                <svg class="reviora-search-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                </svg>
                <input
                  type="text"
                  class="reviora-search-input"
                  id="reviora-search-input"
                  placeholder="Search reviews..."
                  value="${this.searchKeyword}"
                />
              </div>

              <select class="reviora-sort-select" id="reviora-sort-select" aria-label="Sort Reviews">
                <option value="newest" ${this.sortOption === "newest" ? "selected" : ""}>Most Recent</option>
                <option value="highest" ${this.sortOption === "highest" ? "selected" : ""}>Highest Rating</option>
                <option value="lowest" ${this.sortOption === "lowest" ? "selected" : ""}>Lowest Rating</option>
                <option value="helpful" ${this.sortOption === "helpful" ? "selected" : ""}>Most Helpful</option>
              </select>
            </div>
          </div>

          ${activeFilterDesc ? `
            <div class="reviora-active-filter-bar">
              <span>${activeFilterDesc}</span>
              <button type="button" class="reviora-clear-filters-btn" id="reviora-clear-filters-btn">Clear filters</button>
            </div>
          ` : ""}

          <!-- Reviews List -->
          <div class="reviora-list">
            ${reviews.length === 0 ? `
              <div class="reviora-empty-state">
                <div class="reviora-empty-icon">💬</div>
                <h3 class="reviora-empty-title">No reviews match your filter</h3>
                <p class="reviora-empty-sub">Be the first to share your experience or reset your filters to see other feedback.</p>
                <button type="button" class="reviora-write-btn" style="display:inline-flex;width:auto;" id="reviora-empty-open-form-btn">
                  Write the First Review
                </button>
              </div>
            ` : reviews.map((r) => this.renderReviewCard(r)).join("")}
          </div>
        </div>
      `;

      this.createGlobalModal();
      this.attachEventListeners();
    }

    createGlobalModal() {
      if (this.modalEl && this.modalEl.parentNode) {
        this.modalEl.parentNode.removeChild(this.modalEl);
      }

      const modalDiv = document.createElement("div");
      modalDiv.id = "reviora-modal";
      modalDiv.className = "reviora-modal-backdrop is-hidden";
      modalDiv.setAttribute("role", "dialog");
      modalDiv.setAttribute("aria-modal", "true");

      modalDiv.innerHTML = `
        <div class="reviora-modal">
          <div class="reviora-modal-header">
            <div class="reviora-modal-title-group">
              <h3>Write a Review</h3>
              <p class="reviora-modal-subtitle">${this.productTitle ? 'for ' + this.productTitle : 'Share your verified experience'}</p>
            </div>
            <button type="button" id="reviora-close-form-btn" class="reviora-close-btn" aria-label="Close modal">&times;</button>
          </div>

          <div class="reviora-modal-body">
            ${this.photoUploadsEnabled ? `
              <div class="reviora-step-indicator">
                <div class="reviora-step-pill is-active" id="reviora-step-pill-1">
                  <span class="reviora-step-circle">1</span> Rating &amp; Review
                </div>
                <span class="reviora-step-arrow">&rarr;</span>
                <div class="reviora-step-pill" id="reviora-step-pill-2">
                  <span class="reviora-step-circle">2</span> Photos &amp; Media
                </div>
              </div>
            ` : ""}

            <form id="reviora-submit-form">
              <!-- STEP 1: DETAILS -->
              <div id="reviora-step-1" class="reviora-step-panel">
                <div class="reviora-star-picker-wrapper">
                  <span class="reviora-star-picker-label">Overall Rating</span>
                  <div class="reviora-interactive-stars" id="reviora-interactive-stars">
                    ${[1, 2, 3, 4, 5].map((s) => `
                      <button type="button" class="reviora-star-btn" data-value="${s}" style="color: ${this.starColor};">★</button>
                    `).join("")}
                  </div>
                  <span class="reviora-star-text-badge" id="reviora-star-text-badge">${this.getRatingLabel(5)}</span>
                  <input type="hidden" id="reviora-form-rating" value="5" />
                </div>

                <div class="reviora-form-field">
                  <label class="reviora-form-label" for="reviora-form-title">Review Headline *</label>
                  <input type="text" id="reviora-form-title" class="reviora-input" placeholder="e.g. Exceeded my expectations!" required />
                </div>

                <div class="reviora-form-field">
                  <label class="reviora-form-label" for="reviora-form-body">Review Comments *</label>
                  <textarea id="reviora-form-body" class="reviora-textarea" rows="3" placeholder="What did you like or dislike? How was the fit and quality?" required></textarea>
                </div>

                <div class="reviora-form-row">
                  <div class="reviora-form-field">
                    <label class="reviora-form-label" for="reviora-form-name">Your Public Name *</label>
                    <input type="text" id="reviora-form-name" class="reviora-input" placeholder="e.g. Alex M." required />
                  </div>
                  <div class="reviora-form-field">
                    <label class="reviora-form-label" for="reviora-form-email">Your Email *</label>
                    <input type="email" id="reviora-form-email" class="reviora-input" placeholder="alex@example.com" required />
                  </div>
                </div>

                <div class="reviora-submit-row">
                  <button type="button" class="reviora-cancel-btn" id="reviora-cancel-form-btn">Cancel</button>
                  ${this.photoUploadsEnabled ? `
                    <button type="button" class="reviora-write-btn reviora-full-width" id="reviora-goto-step-2-btn">
                      Continue to Photos &rarr;
                    </button>
                  ` : `
                    <button type="submit" class="reviora-write-btn reviora-full-width" id="reviora-direct-submit-btn">
                      Submit Review
                    </button>
                  `}
                </div>
              </div>

              <!-- STEP 2: MEDIA UPLOAD (Only rendered if plan includes photos) -->
              ${this.photoUploadsEnabled ? `
              <div id="reviora-step-2" class="reviora-step-panel" style="display:none;">
                <div id="reviora-media-supported">
                  <label class="reviora-form-label" id="reviora-media-label">Add Photos or Video (Optional)</label>
                  <input type="file" id="reviora-file-input" accept="image/*,video/*" multiple style="display:none;" />
                  <button type="button" class="reviora-dropzone" id="reviora-dropzone" aria-labelledby="reviora-media-label">
                    <span class="reviora-dropzone-icon">📷</span>
                    <span class="reviora-dropzone-text">Click or drag images/videos here</span>
                    <span class="reviora-dropzone-sub">Supported formats: JPG, PNG, WEBP, MP4 (up to 3 files)</span>
                  </button>
                  <div class="reviora-preview-grid" id="reviora-preview-grid"></div>
                </div>

                <div class="reviora-submit-row">
                  <button type="button" class="reviora-cancel-btn" id="reviora-back-to-step-1-btn">&larr; Back</button>
                  <button type="button" class="reviora-skip-btn" id="reviora-skip-media-btn">Skip</button>
                  <button type="submit" class="reviora-write-btn reviora-full-width" id="reviora-final-submit-btn">
                    Submit Review
                  </button>
                </div>
              </div>
              ` : `
              <div id="reviora-step-2" class="reviora-step-panel" style="display:none;"></div>
              `}
            </form>

            <!-- SUCCESS VIEW -->
            <div id="reviora-step-success" class="reviora-success-view" style="display:none;">
              <div class="reviora-success-icon-wrap">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <h3 class="reviora-success-title">Review Submitted!</h3>
              <p class="reviora-success-sub">Thank you for sharing your experience. Your feedback helps our community make informed choices.</p>
              <button type="button" class="reviora-write-btn reviora-full-width" id="reviora-success-done-btn">Done</button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modalDiv);
      this.modalEl = modalDiv;
    }

    attachEventListeners() {
      // Open form button
      const openForm = () => {
        if (!this.modalEl) return;
        this.modalEl.classList.remove("is-hidden");
        this.modalEl.classList.add("is-active");
        document.body.classList.add("reviora-modal-open");
      };

      const closeForm = () => {
        if (!this.modalEl) return;
        this.modalEl.classList.remove("is-active");
        this.modalEl.classList.add("is-hidden");
        document.body.classList.remove("reviora-modal-open");
      };

      const openBtn = this.querySelector("#reviora-open-form-btn");
      if (openBtn) openBtn.onclick = openForm;

      const emptyOpenBtn = this.querySelector("#reviora-empty-open-form-btn");
      if (emptyOpenBtn) emptyOpenBtn.onclick = openForm;

      // Filter pills
      this.querySelectorAll(".reviora-filter-pill").forEach((pill) => {
        pill.onclick = () => {
          const filter = pill.getAttribute("data-filter");
          if (filter === "all") {
            this.selectedFilterRating = null;
            this.selectedFilterMedia = false;
          } else if (filter === "media") {
            this.selectedFilterMedia = !this.selectedFilterMedia;
          } else if (filter.startsWith("star-")) {
            const st = Number(filter.split("-")[1]);
            this.selectedFilterRating = this.selectedFilterRating === st ? null : st;
          }
          this.applyFiltersAndSort();
          this.render();
        };
      });

      // Distribution bar rows click-to-filter
      this.querySelectorAll(".reviora-bar-row").forEach((row) => {
        row.onclick = () => {
          const st = Number(row.getAttribute("data-filter-stars"));
          this.selectedFilterRating = this.selectedFilterRating === st ? null : st;
          this.applyFiltersAndSort();
          this.render();
        };
      });

      // Clear filters
      const clearBtn = this.querySelector("#reviora-clear-filters-btn");
      if (clearBtn) {
        clearBtn.onclick = () => {
          this.selectedFilterRating = null;
          this.selectedFilterMedia = false;
          this.searchKeyword = "";
          this.applyFiltersAndSort();
          this.render();
        };
      }

      // Search input
      const searchInput = this.querySelector("#reviora-search-input");
      if (searchInput) {
        let debounceTimer;
        searchInput.oninput = (e) => {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
  // If the app embed block is disabled in the theme, do not initialize or display widgets
  if (!window.__REVIORA_APP_EMBED_ENABLED__) {
    const hideAll = () => {
      document.querySelectorAll(
        ".reviora-app-block, .reviora-star-badge-block, reviora-reviews-widget, reviora-reviews-carousel, reviora-floating-tab, reviora-review-popups, reviora-ugc-media-grid, reviora-all-reviews-page, reviora-qa-widget"
      ).forEach((el) => el.style.setProperty("display", "none", "important"));
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", hideAll);
    } else {
      hideAll();
    }
    return;
  }
            this.searchKeyword = e.target.value;
            this.applyFiltersAndSort();
            this.render();
          }, 250);
        };
      }

      // Sort dropdown
      const sortSelect = this.querySelector("#reviora-sort-select");
      if (sortSelect) {
        sortSelect.onchange = (e) => {
          this.sortOption = e.target.value;
          this.applyFiltersAndSort();
          this.render();
        };
      }

      // Media item click -> open Lightbox
      this.querySelectorAll(".reviora-media-item").forEach((item) => {
        item.onclick = (e) => {
          e.stopPropagation();
          const reviewId = item.getAttribute("data-review-id");
          const idx = Number(item.getAttribute("data-media-idx") || 0);
          const review = this.rawReviews.find((r) => String(r.id) === String(reviewId));
          if (review && review.media && review.media.length > 0) {
            globalLightbox.open(review.media, idx, review.authorName);
          }
        };
      });

      // Helpful vote button
      this.querySelectorAll(".reviora-helpful-btn").forEach((btn) => {
        btn.onclick = async () => {
          const reviewId = btn.getAttribute("data-review-id");
          if (!reviewId || localStorage.getItem(`reviora_voted_${reviewId}`)) return;

          btn.disabled = true;
          const base = this.apiUrl || "";
          try {
            const res = await fetch(`${base}/api/reviews/${reviewId}/vote`, { method: "POST" });
            const result = await res.json();
            if (result.success) {
              localStorage.setItem(`reviora_voted_${reviewId}`, "true");
              btn.classList.add("is-voted");
              const span = btn.querySelector("span");
              if (span) span.textContent = `Helpful (${result.helpfulCount})`;
            }
          } catch (e) {
            console.error("Helpful vote error:", e);
          }
        };
      });

      // Modal internal logic
      const modal = this.modalEl;
      if (!modal) return;

      const closeBtn = modal.querySelector("#reviora-close-form-btn");
      if (closeBtn) closeBtn.onclick = closeForm;
      const cancelBtn = modal.querySelector("#reviora-cancel-form-btn");
      if (cancelBtn) cancelBtn.onclick = closeForm;

      modal.onclick = (e) => {
        if (e.target === modal) closeForm();
      };

      const step1Panel = modal.querySelector("#reviora-step-1");
      const step2Panel = modal.querySelector("#reviora-step-2");
      const successPanel = modal.querySelector("#reviora-step-success");
      const stepPill1 = modal.querySelector("#reviora-step-pill-1");
      const stepPill2 = modal.querySelector("#reviora-step-pill-2");
      const stepIndicator = modal.querySelector(".reviora-step-indicator");
      const form = modal.querySelector("#reviora-submit-form");

      const setStep = (step) => {
        this.currentStep = step;
        if (step === 1) {
          form.style.display = "block";
          if (stepIndicator) {
            stepIndicator.style.display = this.photoUploadsEnabled ? "flex" : "none";
          }
          if (step1Panel) step1Panel.style.display = "block";
          if (step2Panel) step2Panel.style.display = "none";
          if (successPanel) successPanel.style.display = "none";
          if (stepPill1) stepPill1.className = "reviora-step-pill is-active";
          if (stepPill2) stepPill2.className = "reviora-step-pill";
        } else if (step === 2) {
          if (!this.photoUploadsEnabled) {
            setStep(1);
            return;
          }
          form.style.display = "block";
          if (stepIndicator) stepIndicator.style.display = "flex";
          if (step1Panel) step1Panel.style.display = "none";
          if (step2Panel) step2Panel.style.display = "block";
          if (successPanel) successPanel.style.display = "none";
          if (stepPill1) stepPill1.className = "reviora-step-pill is-done";
          if (stepPill2) stepPill2.className = "reviora-step-pill is-active";
        } else if (step === 3) {
          form.style.display = "none";
          if (stepIndicator) stepIndicator.style.display = "none";
          if (successPanel) successPanel.style.display = "block";
        }
      };

      const gotoStep2Btn = modal.querySelector("#reviora-goto-step-2-btn");
      if (gotoStep2Btn) {
        gotoStep2Btn.onclick = () => {
          const t = modal.querySelector("#reviora-form-title");
          const b = modal.querySelector("#reviora-form-body");
          const n = modal.querySelector("#reviora-form-name");
          const e = modal.querySelector("#reviora-form-email");

          if (!t.value.trim() || !b.value.trim() || !n.value.trim() || !e.value.trim()) {
            t.reportValidity();
            b.reportValidity();
            n.reportValidity();
            e.reportValidity();
            return;
          }
          setStep(2);
        };
      }

      const backBtn = modal.querySelector("#reviora-back-to-step-1-btn");
      if (backBtn) backBtn.onclick = () => setStep(1);

      const skipBtn = modal.querySelector("#reviora-skip-media-btn");
      if (skipBtn) {
        skipBtn.onclick = () => {
          this.uploadedMedia = [];
          if (form.requestSubmit) {
            form.requestSubmit();
          } else {
            form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
          }
        };
      }

      const doneBtn = modal.querySelector("#reviora-success-done-btn");
      if (doneBtn) {
        doneBtn.onclick = () => {
          closeForm();
          form.reset();
          this.uploadedMedia = [];
          setStep(1);
        };
      }

      // Star picker
      const starRatingInput = modal.querySelector("#reviora-form-rating");
      const starTextBadge = modal.querySelector("#reviora-star-text-badge");
      const starBtns = modal.querySelectorAll(".reviora-star-btn");

      const updateStarButtons = (val) => {
        starRatingInput.value = val;
        starTextBadge.textContent = this.getRatingLabel(val);
        starBtns.forEach((btn) => {
          const bVal = Number(btn.getAttribute("data-value"));
          btn.style.color = bVal <= val ? this.starColor : "#E2E8F0";
        });
      };

      starBtns.forEach((btn) => {
        btn.onclick = () => {
          const val = Number(btn.getAttribute("data-value"));
          updateStarButtons(val);
        };
      });

      // Drag and drop file uploads
      const dropzone = modal.querySelector("#reviora-dropzone");
      const fileInput = modal.querySelector("#reviora-file-input");
      const previewGrid = modal.querySelector("#reviora-preview-grid");

      const renderPreviews = () => {
        if (!previewGrid) return;
        previewGrid.innerHTML = this.uploadedMedia
          .map((m, idx) => `
            <div class="reviora-preview-thumb">
              ${m.type === "VIDEO" ? `<video src="${m.url}"></video>` : `<img src="${m.url}" alt="Preview" />`}
              <button type="button" class="reviora-remove-thumb" data-idx="${idx}">&times;</button>
            </div>
          `)
          .join("");

        previewGrid.querySelectorAll(".reviora-remove-thumb").forEach((b) => {
          b.onclick = (e) => {
            e.stopPropagation();
            const idx = Number(b.getAttribute("data-idx"));
            this.uploadedMedia.splice(idx, 1);
            renderPreviews();
          };
        });
      };

      const handleFiles = (files) => {
        if (!this.photoUploadsEnabled) return;
        Array.from(files).forEach((file) => {
          if (this.uploadedMedia.length >= 3) return;
          const reader = new FileReader();
          reader.onload = (e) => {
            const isVideo = file.type.startsWith("video/");
            this.uploadedMedia.push({
              type: isVideo ? "VIDEO" : "PHOTO",
              url: e.target.result,
              name: file.name,
            });
            renderPreviews();
          };
          reader.readAsDataURL(file);
        });
      };

      if (dropzone && fileInput) {
        dropzone.onclick = () => fileInput.click();
        dropzone.ondragover = (e) => e.preventDefault();
        dropzone.ondrop = (e) => {
          e.preventDefault();
          if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
        };
        fileInput.onchange = () => {
          if (fileInput.files) handleFiles(fileInput.files);
        };
      }

      // Form submission
      if (form) {
        form.onsubmit = async (e) => {
          e.preventDefault();
          const submitBtn = modal.querySelector("#reviora-final-submit-btn") || modal.querySelector("#reviora-direct-submit-btn");
          const skipBtnEl = modal.querySelector("#reviora-skip-media-btn");
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = "Submitting Review...";
          }
          if (skipBtnEl) skipBtnEl.disabled = true;

          const payload = {
            shop: this.shop,
            productId: this.productId,
            productHandle: this.productHandle,
            productTitle: this.productTitle,
            rating: Number(starRatingInput.value || 5),
            title: modal.querySelector("#reviora-form-title").value,
            body: modal.querySelector("#reviora-form-body").value,
            authorName: modal.querySelector("#reviora-form-name").value,
            authorEmail: modal.querySelector("#reviora-form-email").value,
            mediaUrls: this.photoUploadsEnabled ? this.uploadedMedia : [],
          };

          const base = this.apiUrl || "";
          try {
            const res = await fetch(`${base}/api/reviews`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });

            if (res.ok) {
              setStep(3);
              this.fetchReviews();
              setTimeout(() => {
  // If the app embed block is disabled in the theme, do not initialize or display widgets
  if (!window.__REVIORA_APP_EMBED_ENABLED__) {
    const hideAll = () => {
      document.querySelectorAll(
        ".reviora-app-block, .reviora-star-badge-block, reviora-reviews-widget, reviora-reviews-carousel, reviora-floating-tab, reviora-review-popups, reviora-ugc-media-grid, reviora-all-reviews-page, reviora-qa-widget"
      ).forEach((el) => el.style.setProperty("display", "none", "important"));
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", hideAll);
    } else {
      hideAll();
    }
    return;
  }
                closeForm();
                form.reset();
                this.uploadedMedia = [];
                setStep(1);
              }, 4000);
            } else {
              alert("Could not submit review. Please try again.");
            }
          } catch {
            alert("Network error submitting review.");
          } finally {
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.textContent = "Submit Review";
            }
            if (skipBtnEl) skipBtnEl.disabled = false;
          }
        };
      }
    }
  }

  if (!customElements.get("reviora-reviews-widget")) {
    customElements.define("reviora-reviews-widget", RevioraReviewsWidget);
  }

  // =========================================================
  // CAROUSEL COMPONENT (<reviora-reviews-carousel>)
  // Supports type="cards" | "testimonials" | "videos"
  // =========================================================
  // Demo items displayed when merchant is customizing in Shopify Theme Editor or when 0 reviews exist
  const DEMO_VIDEO_REELS = [
    {
      authorName: "Sarah M.",
      rating: 5,
      productTitle: "Allemano - Collection 1919",
      verified: true,
      media: [
        {
          mediaType: "IMAGE",
          url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80",
        },
      ],
    },
    {
      authorName: "Marcus V.",
      rating: 5,
      productTitle: "Collection 1973 - Shark",
      verified: true,
      media: [
        {
          mediaType: "IMAGE",
          url: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600&auto=format&fit=crop&q=80",
        },
      ],
    },
    {
      authorName: "Jessica T.",
      rating: 5,
      productTitle: "Shark & Crab Chrono",
      verified: true,
      media: [
        {
          mediaType: "IMAGE",
          url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80",
        },
      ],
    },
    {
      authorName: "David K.",
      rating: 5,
      productTitle: "Nautoscaph - All Red",
      verified: true,
      media: [
        {
          mediaType: "IMAGE",
          url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80",
        },
      ],
    },
  ];

  const DEMO_TESTIMONIALS = [
    {
      authorName: "Emma Watson",
      rating: 5,
      body: "The quality exceeded my expectations. Fast shipping and the customer service was phenomenal!",
      verified: true,
    },
    {
      authorName: "Liam Johnson",
      rating: 5,
      body: "Unbelievable craftsmanship. I get compliments everywhere I go. Highly recommend!",
      verified: true,
    },
    {
      authorName: "Sophia Davis",
      rating: 5,
      body: "Best purchase I've made all year. The attention to detail is noticeable the moment you open the box.",
      verified: true,
    },
  ];

  const DEMO_CARDS = [
    {
      authorName: "Michael Brown",
      rating: 5,
      title: "Exceptional Quality",
      body: "Arrived quickly and in pristine condition. Exactly what I was looking for!",
      productTitle: "Classic Collection",
      verified: true,
    },
    {
      authorName: "Olivia Wilson",
      rating: 5,
      title: "Highly Recommend!",
      body: "Super satisfied with the entire experience. Will definitely be buying again soon.",
      productTitle: "Signature Item",
      verified: true,
    },
    {
      authorName: "James Taylor",
      rating: 5,
      title: "Worth Every Penny",
      body: "Great value for money. Build quality is sturdy and feels truly premium.",
      productTitle: "Essential Series",
      verified: true,
    },
  ];

  class RevioraReviewsCarousel extends HTMLElement {
    constructor() {
      super();
      this.type = this.getAttribute("type") || "cards";
      this.shop =
        this.getAttribute("data-shop") ||
        window.Shopify?.shop ||
        (window.location.hostname.includes("myshopify.com") ? window.location.hostname : "");
      let cId =
        this.getAttribute("data-product-handle") ||
        this.getAttribute("data-product-id") ||
        "all";
      if ((!cId || cId === "all") && window.location.pathname.includes("/products/")) {
        const match = window.location.pathname.match(/\/products\/([^/?#]+)/);
        if (match && match[1]) {
          cId = decodeURIComponent(match[1]);
        }
      }
      this.productId = cId;
      this.heading = this.getAttribute("data-heading") || "Customer Reviews";
      this.subheading = this.getAttribute("data-subheading") || "Real stories from our community";
      this.starColor = this.getAttribute("data-star-color") || "#FFB800";
      this.limit = Number(this.getAttribute("data-limit")) || 8;
      this.autoplay = this.getAttribute("data-autoplay") === "true";
      this.apiUrl =
        cleanBaseUrl(this.getAttribute("data-api-url")) ||
        window.RevioraApiUrl ||
        "https://reviora-ef66.onrender.com";
      this.reviews = [];
      this.autoplayTimer = null;
    }

    connectedCallback() {
      // Refresh attributes from block settings
      this.type = this.getAttribute("type") || this.type || "cards";
      this.heading = this.getAttribute("data-heading") || this.heading || "Customer Reviews";
      this.subheading = this.getAttribute("data-subheading") || this.subheading || "";
      this.starColor = this.getAttribute("data-star-color") || this.starColor || "#FFB800";
      this.limit = Number(this.getAttribute("data-limit")) || this.limit || 8;
      this.autoplay = this.getAttribute("data-autoplay") === "true";
      const customApi = this.getAttribute("data-api-url");
      if (customApi) {
        this.apiUrl = cleanBaseUrl(customApi);
      }

      // Check if we are inside the Shopify Theme Editor
      const isThemeEditor = Boolean(
        (window.Shopify && window.Shopify.designMode) ||
        document.body.classList.contains("shopify-design-mode") ||
        document.querySelector(".shopify-section") ||
        window.location.search.includes("shopify-editor") ||
        window.self !== window.top
      );

      // Render immediately with preview in Theme Editor
      if (isThemeEditor) {
        this.render();
      }

      this.fetchCarouselData();
    }

    disconnectedCallback() {
      if (this.autoplayTimer) clearInterval(this.autoplayTimer);
    }

    async fetchCarouselData() {
      const shopParam = encodeURIComponent(this.shop || "");
      const productParam = encodeURIComponent(this.productId || "all");
      const base = this.apiUrl || "https://reviora-ef66.onrender.com";
      const endpoint = `${base}/api/reviews?shop=${shopParam}&productId=${productParam}&limit=${this.limit}`;

      try {
        const res = await fetch(endpoint, { headers: { Accept: "application/json" } });
        if (res.ok) {
          const data = await res.json();
          if (data && data.reviews && data.reviews.length > 0) {
            this.reviews = data.reviews;
          }
        }
      } catch (e) {
        console.warn("Carousel API fallback:", e);
      }

      this.render();
    }

    render() {
      const isThemeEditor = Boolean(
        (window.Shopify && window.Shopify.designMode) ||
        document.body.classList.contains("shopify-design-mode") ||
        document.querySelector(".shopify-section") ||
        window.location.search.includes("shopify-editor") ||
        window.self !== window.top
      );

      let targetList = [];
      let isDemoMode = false;

      if (this.type === "videos") {
        const videoReviews = (this.reviews || []).filter(
          (r) => r.media && r.media.some((m) => m.mediaType === "VIDEO" || /\.(mp4|webm)($|\?)/i.test(m.url))
        );
        targetList = videoReviews.length > 0 ? videoReviews : (this.reviews || []);
      } else {
        targetList = this.reviews || [];
      }

      // If no customer reviews exist yet:
      if (!targetList || targetList.length === 0) {
        if (isThemeEditor) {
          isDemoMode = true;
          if (this.type === "videos") {
            targetList = DEMO_VIDEO_REELS;
          } else if (this.type === "testimonials") {
            targetList = DEMO_TESTIMONIALS;
          } else {
            targetList = DEMO_CARDS;
          }
        } else {
          // On live storefront with 0 reviews
          this.innerHTML = "";
          return;
        }
      }

      let slidesHtml = "";
      if (this.type === "testimonials") {
        slidesHtml = targetList.map((r) => `
          <div class="reviora-testimonial-slide">
            <div class="reviora-testimonial-quote-icon">&ldquo;</div>
            <p class="reviora-testimonial-text">"${escapeHtml(r.body)}"</p>
            <div style="margin-bottom:8px;">${renderStarsSvg(r.rating, this.starColor, 15)}</div>
            <div style="font-weight:700;font-size:14px;color:#0f172a;">${escapeHtml(r.authorName)}</div>
            ${r.verified ? `
              <span class="reviora-verified-badge" style="margin-top:4px;">
                <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                Verified Buyer
              </span>
            ` : ""}
          </div>
        `).join("");
      } else if (this.type === "videos") {
        slidesHtml = targetList.map((r, idx) => {
          const media = r.media && r.media.length > 0 ? r.media[0] : null;
          const isVideo = media && (media.mediaType === "VIDEO" || /\.(mp4|webm)($|\?)/i.test(media.url));
          return `
            <div class="reviora-video-reel-slide" data-idx="${idx}">
              ${media ? (
              isVideo
                ? `<video src="${encodeURI(media.url)}" ${media.poster ? `poster="${encodeURI(media.poster)}"` : ""} class="reviora-video-reel-media" preload="metadata" muted playsinline></video>`
                : `<img src="${encodeURI(media.url)}" class="reviora-video-reel-media" alt="Review media" />`
            ) : `
                <div style="width:100%;height:100%;background:linear-gradient(135deg,#1e293b,#0f172a);display:flex;align-items:center;justify-content:center;color:#fff;font-size:32px;">★</div>
              `}
              <div class="reviora-video-reel-overlay">
                <div class="reviora-reel-play-btn">▶</div>
                <div class="reviora-reel-meta">
                  <div class="reviora-reel-author">${escapeHtml(r.authorName)}</div>
                  <div class="reviora-reel-stars">${renderStarsSvg(r.rating, this.starColor, 13)}</div>
                  ${r.productTitle ? `<div style="font-size:10px;opacity:0.85;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(r.productTitle)}</div>` : ""}
                </div>
              </div>
            </div>
          `;
        }).join("");
      } else {
        // Standard Cards Carousel
        slidesHtml = targetList.map((r) => {
          const initials = (r.authorName || "C").slice(0, 2).toUpperCase();
          return `
            <div class="reviora-carousel-card">
              <div>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                  <div style="display:flex;align-items:center;gap:8px;">
                    <div class="reviora-avatar" style="width:32px;height:32px;font-size:12px;">${escapeHtml(initials)}</div>
                    <div>
                      <div style="font-weight:700;font-size:13px;color:#0f172a;">${escapeHtml(r.authorName)}</div>
                      ${r.verified ? `
                        <span class="reviora-verified-badge" style="font-size:10px;padding:1px 5px;">
                          <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                          Verified
                        </span>
                      ` : ""}
                    </div>
                  </div>
                  <div>${renderStarsSvg(r.rating, this.starColor, 13)}</div>
                </div>

                ${r.title ? `<div style="font-weight:700;font-size:14px;color:#0f172a;margin-bottom:6px;">${escapeHtml(r.title)}</div>` : ""}
                <div style="font-size:13px;line-height:1.5;color:#475569;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;">
                  ${escapeHtml(r.body || "")}
                </div>
              </div>

              ${r.productTitle ? `
                <div class="reviora-card-product-tag">
                  <span>🛍️</span>
                  <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:200px;">${escapeHtml(r.productTitle)}</span>
                </div>
              ` : ""}
            </div>
          `;
        }).join("");
      }

      const demoNoticeHtml = isDemoMode
        ? `
          <div style="text-align:center;margin-top:12px;">
            <span style="font-size:11px;color:#059669;background:#ecfdf5;border:1px solid #a7f3d0;padding:4px 12px;border-radius:12px;display:inline-block;font-weight:600;">
              ✨ Theme Editor Preview • Real customer videos will display here once collected
            </span>
          </div>
        `
        : "";

      this.innerHTML = `
        <div class="reviora-carousel-block">
          <div class="reviora-carousel-header">
            <h2 class="reviora-carousel-title">${this.heading}</h2>
            ${this.subheading ? `<p class="reviora-carousel-sub">${this.subheading}</p>` : ""}
            ${demoNoticeHtml}
          </div>

          <div class="reviora-carousel-track-wrap">
            <button type="button" class="reviora-carousel-nav-btn reviora-carousel-prev" aria-label="Previous">&lsaquo;</button>
            <div class="reviora-carousel-track" id="reviora-carousel-track">
              ${slidesHtml}
            </div>
            <button type="button" class="reviora-carousel-nav-btn reviora-carousel-next" aria-label="Next">&rsaquo;</button>
          </div>
        </div>
      `;

      this.attachCarouselEvents();
    }

    attachCarouselEvents() {
      const track = this.querySelector("#reviora-carousel-track");
      const prevBtn = this.querySelector(".reviora-carousel-prev");
      const nextBtn = this.querySelector(".reviora-carousel-next");
      if (!track) return;

      const scrollAmount = 320;
      if (prevBtn) {
        prevBtn.onclick = () => track.scrollBy({ left: -scrollAmount, behavior: "smooth" });
      }
      if (nextBtn) {
        nextBtn.onclick = () => track.scrollBy({ left: scrollAmount, behavior: "smooth" });
      }

      // Autoplay if configured
      if (this.autoplay) {
        this.autoplayTimer = setInterval(() => {
  // If the app embed block is disabled in the theme, do not initialize or display widgets
  if (!window.__REVIORA_APP_EMBED_ENABLED__) {
    const hideAll = () => {
      document.querySelectorAll(
        ".reviora-app-block, .reviora-star-badge-block, reviora-reviews-widget, reviora-reviews-carousel, reviora-floating-tab, reviora-review-popups, reviora-ugc-media-grid, reviora-all-reviews-page, reviora-qa-widget"
      ).forEach((el) => el.style.setProperty("display", "none", "important"));
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", hideAll);
    } else {
      hideAll();
    }
    return;
  }
          if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 10) {
            track.scrollTo({ left: 0, behavior: "smooth" });
          } else {
            track.scrollBy({ left: scrollAmount, behavior: "smooth" });
          }
        }, 5000);

        track.addEventListener("mouseenter", () => clearInterval(this.autoplayTimer));
        track.addEventListener("mouseleave", () => {
          this.autoplayTimer = setInterval(() => {
  // If the app embed block is disabled in the theme, do not initialize or display widgets
  if (!window.__REVIORA_APP_EMBED_ENABLED__) {
    const hideAll = () => {
      document.querySelectorAll(
        ".reviora-app-block, .reviora-star-badge-block, reviora-reviews-widget, reviora-reviews-carousel, reviora-floating-tab, reviora-review-popups, reviora-ugc-media-grid, reviora-all-reviews-page, reviora-qa-widget"
      ).forEach((el) => el.style.setProperty("display", "none", "important"));
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", hideAll);
    } else {
      hideAll();
    }
    return;
  }
            if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 10) {
              track.scrollTo({ left: 0, behavior: "smooth" });
            } else {
              track.scrollBy({ left: scrollAmount, behavior: "smooth" });
            }
          }, 5000);
        });
      }

      // If video reels, click slide to open in lightbox
      if (this.type === "videos") {
        this.querySelectorAll(".reviora-video-reel-slide").forEach((slide) => {
          slide.onclick = () => {
            const idx = Number(slide.getAttribute("data-idx"));
            const review = this.reviews[idx];
            if (review && review.media && review.media.length > 0) {
              globalLightbox.open(review.media, 0, review.authorName);
            }
          };
        });
      }
    }
  }

  if (!customElements.get("reviora-reviews-carousel")) {
    customElements.define("reviora-reviews-carousel", RevioraReviewsCarousel);
  }

  // =========================================================
  // 4. FLOATING REVIEWS TAB & DRAWER
  // =========================================================
  class RevioraFloatingTab extends HTMLElement {
    connectedCallback() {
      this.shop = this.getAttribute("data-shop") || window.Shopify?.shop || "";
      this.position = this.getAttribute("data-position") || "bottom-right";
      this.tabText = this.getAttribute("data-tab-text") || "Reviews";
      this.bgColor = this.getAttribute("data-bg-color") || "#0F172A";
      this.textColor = this.getAttribute("data-text-color") || "#FFFFFF";
      this.starColor = this.getAttribute("data-star-color") || "#FFB800";
      this.isOpen = false;
      this.reviews = [];
      this.render();
      this.fetchReviews();
    }

    async fetchReviews() {
      try {
        const res = await fetch(`/apps/reviora/api/reviews?shop=${encodeURIComponent(this.shop)}&limit=10`);
        if (res.ok) {
          const data = await res.json();
          this.reviews = data.reviews || [];
          this.updateDrawerContent();
        }
      } catch (e) {
        console.warn("[Reviora] Floating tab fetch error", e);
      }
    }

    render() {
      const posClass = `pos-${this.position}`;
      const isRight = this.position.includes("right");
      const drawerPosClass = isRight ? "pos-right" : "pos-left";

      this.innerHTML = `
        <div class="reviora-floating-tab-trigger ${posClass}" style="background:${this.bgColor};color:${this.textColor};">
          <span style="color:${this.starColor};">★</span>
          <span>${this.tabText}</span>
        </div>

        <div class="reviora-drawer-backdrop is-hidden" id="reviora-tab-backdrop"></div>
        <div class="reviora-drawer ${drawerPosClass} is-closed" id="reviora-tab-drawer">
          <div class="reviora-drawer-header">
            <div>
              <div style="font-weight:800;font-size:16px;color:#0f172a;">Customer Reviews</div>
              <div style="font-size:12px;color:#64748b;">Verified store feedback</div>
            </div>
            <button type="button" id="reviora-drawer-close-btn" style="background:none;border:none;font-size:22px;color:#94a3b8;cursor:pointer;">&times;</button>
          </div>
          <div class="reviora-drawer-body" id="reviora-drawer-body">
            <div style="text-align:center;padding:30px 0;color:#94a3b8;font-size:13px;">Loading reviews...</div>
          </div>
          <div class="reviora-drawer-footer">
            <button type="button" id="reviora-drawer-write-btn" class="reviora-write-btn" style="width:100%;margin:0;background:${this.bgColor};color:${this.textColor};">
              Write a Review
            </button>
          </div>
        </div>
      `;

      const trigger = this.querySelector(".reviora-floating-tab-trigger");
      const backdrop = this.querySelector("#reviora-tab-backdrop");
      const drawer = this.querySelector("#reviora-tab-drawer");
      const closeBtn = this.querySelector("#reviora-drawer-close-btn");
      const writeBtn = this.querySelector("#reviora-drawer-write-btn");

      const openDrawer = () => {
        backdrop.classList.remove("is-hidden");
        drawer.classList.remove("is-closed");
        this.isOpen = true;
      };

      const closeDrawer = () => {
        backdrop.classList.add("is-hidden");
        drawer.classList.add("is-closed");
        this.isOpen = false;
      };

      trigger.onclick = openDrawer;
      backdrop.onclick = closeDrawer;
      closeBtn.onclick = closeDrawer;

      if (writeBtn) {
        writeBtn.onclick = () => {
          closeDrawer();
          const mainWidget = document.querySelector("reviora-reviews-widget");
          if (mainWidget) {
            mainWidget.scrollIntoView({ behavior: "smooth" });
            const modal = mainWidget.querySelector("#reviora-write-modal");
            if (modal) modal.classList.remove("is-hidden");
          }
        };
      }
    }

    updateDrawerContent() {
      const body = this.querySelector("#reviora-drawer-body");
      if (!body) return;

      const list = this.reviews.length > 0 ? this.reviews : DEMO_CARDS;
      body.innerHTML = list.map((r) => `
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <span style="font-weight:700;font-size:13px;color:#0f172a;">${escapeHtml(r.authorName)}</span>
            <span class="reviora-verified-badge" style="font-size:10px;">✓ Verified</span>
          </div>
          <div style="margin-bottom:6px;">${renderStarsSvg(r.rating || 5, this.starColor, 13)}</div>
          ${r.title ? `<div style="font-weight:700;font-size:13px;color:#0f172a;margin-bottom:4px;">${escapeHtml(r.title)}</div>` : ""}
          <p style="margin:0;font-size:12px;color:#475569;line-height:1.4;">${escapeHtml(r.body)}</p>
        </div>
      `).join("");
    }
  }

  if (!customElements.get("reviora-floating-tab")) {
    customElements.define("reviora-floating-tab", RevioraFloatingTab);
  }

  // =========================================================
  // 5. SOCIAL PROOF REVIEW POPUP TOASTS
  // =========================================================
  class RevioraReviewPopups extends HTMLElement {
    connectedCallback() {
      this.shop = this.getAttribute("data-shop") || window.Shopify?.shop || "";
      this.position = this.getAttribute("data-position") || "bottom-left";
      this.intervalSec = Number(this.getAttribute("data-interval") || 6);
      this.starColor = this.getAttribute("data-star-color") || "#FFB800";
      this.reviews = [];
      this.currentIndex = 0;
      this.render();
      this.fetchAndStart();
    }

    disconnectedCallback() {
      if (this.timer) clearInterval(this.timer);
    }

    async fetchAndStart() {
      try {
        const res = await fetch(`/apps/reviora/api/reviews?shop=${encodeURIComponent(this.shop)}&limit=10`);
        if (res.ok) {
          const data = await res.json();
          this.reviews = data.reviews || [];
        }
      } catch (e) {
        console.warn("[Reviora] Popup fetch error", e);
      }
      this.startLoop();
    }

    render() {
      const posClass = `pos-${this.position}`;
      this.innerHTML = `
        <div class="reviora-popup-container ${posClass}" id="reviora-popup-container"></div>
      `;
    }

    startLoop() {
      const list = this.reviews.length > 0 ? this.reviews : DEMO_CARDS;
      if (list.length === 0) return;

      const showNext = () => {
        const container = this.querySelector("#reviora-popup-container");
        if (!container) return;

        const r = list[this.currentIndex];
        this.currentIndex = (this.currentIndex + 1) % list.length;

        const initials = (r.authorName || "Customer").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

        const toast = document.createElement("div");
        toast.className = "reviora-popup-toast";
        toast.innerHTML = `
          <button type="button" class="reviora-popup-close" aria-label="Close">&times;</button>
          <div class="reviora-popup-avatar">${escapeHtml(initials)}</div>
          <div style="flex:1;min-width:0;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px;">
              <span style="font-weight:700;font-size:12px;color:#0f172a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(r.authorName)}</span>
              <span style="color:#059669;font-size:10px;font-weight:700;">✓ Verified</span>
            </div>
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">
              ${renderStarsSvg(r.rating || 5, this.starColor, 11)}
              <span style="font-size:10px;color:#94a3b8;">Recent order</span>
            </div>
            <div style="font-size:11px;color:#475569;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-style:italic;">
              "${escapeHtml(r.body || r.title || 'Excellent purchase!')}"
            </div>
          </div>
        `;

        toast.querySelector(".reviora-popup-close").onclick = () => {
          toast.remove();
        };

        container.innerHTML = "";
        container.appendChild(toast);

        setTimeout(() => {
  // If the app embed block is disabled in the theme, do not initialize or display widgets
  if (!window.__REVIORA_APP_EMBED_ENABLED__) {
    const hideAll = () => {
      document.querySelectorAll(
        ".reviora-app-block, .reviora-star-badge-block, reviora-reviews-widget, reviora-reviews-carousel, reviora-floating-tab, reviora-review-popups, reviora-ugc-media-grid, reviora-all-reviews-page, reviora-qa-widget"
      ).forEach((el) => el.style.setProperty("display", "none", "important"));
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", hideAll);
    } else {
      hideAll();
    }
    return;
  }
          if (toast.parentNode) {
            toast.classList.add("is-fading");
            setTimeout(() => toast.remove(), 300);
          }
        }, (this.intervalSec - 1) * 1000);
      };

      setTimeout(showNext, 2000);
      this.timer = setInterval(showNext, this.intervalSec * 1000);
    }
  }

  if (!customElements.get("reviora-review-popups")) {
    customElements.define("reviora-review-popups", RevioraReviewPopups);
  }

  // =========================================================
  // 6. UGC PHOTO & VIDEO WALL GRID
  // =========================================================
  class RevioraUgcMediaGrid extends HTMLElement {
    connectedCallback() {
      this.shop =
        this.getAttribute("data-shop") ||
        window.Shopify?.shop ||
        (window.location.hostname.includes("myshopify.com") ? window.location.hostname : "");
      this.heading = this.getAttribute("data-heading") || "Customer Photos & Videos";
      this.subheading = this.getAttribute("data-subheading") || "Real photos shared by verified customers";
      this.columns = this.getAttribute("data-columns") || "4";
      this.starColor = this.getAttribute("data-star-color") || "#FFB800";
      this.apiUrl =
        cleanBaseUrl(this.getAttribute("data-api-url")) ||
        window.RevioraApiUrl ||
        "https://reviora-ef66.onrender.com";

      this.render();
      this.fetchMedia();
    }

    async fetchMedia() {
      const base = this.apiUrl || window.RevioraApiUrl || "https://reviora-ef66.onrender.com";
      const shopParam = encodeURIComponent(this.shop || "");
      const urls = [
        `${base}/api/reviews?shop=${shopParam}&productId=all&limit=50`,
        `/apps/reviora/api/reviews?shop=${shopParam}&limit=50`,
        `/api/reviews?shop=${shopParam}&limit=50`,
      ];

      for (const endpoint of urls) {
        try {
          const res = await fetch(endpoint, {
            headers: { Accept: "application/json" },
          });
          if (res.ok) {
            const data = await res.json();
            const reviewsWithMedia = (data.reviews || []).filter(
              (r) => r.media && r.media.length > 0
            );
            if (reviewsWithMedia.length > 0) {
              this.renderGrid(reviewsWithMedia);
              return;
            }
          }
        } catch (e) {
          // try next endpoint fallback
        }
      }
    }

    render() {
      this.innerHTML = `
        <div class="reviora-carousel-block">
          <div class="reviora-carousel-header">
            <h2 class="reviora-carousel-title">${this.heading}</h2>
            ${this.subheading ? `<p class="reviora-carousel-sub">${this.subheading}</p>` : ""}
          </div>
          <div class="reviora-ugc-grid cols-${this.columns}" id="reviora-ugc-grid-items">
            ${[
              { img: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&auto=format&fit=crop&q=80", author: "Sarah J.", note: "Loved it!", stars: "★★★★★" },
              { img: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&auto=format&fit=crop&q=80", author: "Marcus V.", note: "Video Review", stars: "★★★★★", isVid: true },
              { img: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&auto=format&fit=crop&q=80", author: "Emily W.", note: "Perfect Fit", stars: "★★★★★" },
              { img: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80", author: "David M.", note: "Great Sound", stars: "★★★★★" }
            ].map((d) => `
              <div class="reviora-ugc-tile" style="position:relative;overflow:hidden;border-radius:12px;background:#0f172a;">
                <img src="${d.img}" alt="${d.author}" style="width:100%;height:100%;object-fit:cover;display:block;" loading="lazy">
                ${d.isVid ? `<span style="position:absolute;top:10px;right:10px;background:rgba(15,23,42,0.8);color:#fff;padding:3px 7px;border-radius:6px;font-size:10px;font-weight:700;">▶ 0:45</span>` : ""}
                <div class="reviora-ugc-tile-overlay" style="position:absolute;bottom:0;left:0;right:0;padding:12px;background:linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 70%, transparent 100%);color:#fff;display:flex;justify-content:space-between;align-items:flex-end;">
                  <div>
                    <div style="font-weight:700;font-size:12px;">${d.author}</div>
                    <div style="font-size:10px;opacity:0.85;">${d.note}</div>
                  </div>
                  <div style="color:#fbbf24;font-size:11px;letter-spacing:1px;">${d.stars}</div>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      `;
    }

    renderGrid(reviews) {
      if (!reviews || reviews.length === 0) return;
      const grid = this.querySelector("#reviora-ugc-grid-items");
      if (!grid) return;

      const mediaItems = [];
      reviews.forEach((r) => {
        (r.media || []).forEach((m, mIdx) => {
          if (m && m.url) {
            mediaItems.push({
              review: r,
              media: m,
              mediaIdx: mIdx,
            });
          }
        });
      });

      if (mediaItems.length === 0) return;

      grid.innerHTML = mediaItems.slice(0, 16).map((item, idx) => {
        const m = item.media;
        const r = item.review;
        const isVideo = m.mediaType === "VIDEO" || (m.url && /\.(mp4|webm|mov)($|\?)/i.test(m.url));
        return `
          <div class="reviora-ugc-tile" data-media-idx="${idx}" style="position:relative;overflow:hidden;border-radius:12px;background:#0f172a;cursor:pointer;">
            ${isVideo
              ? `<video src="${encodeURI(m.url)}" muted playsinline loop style="width:100%;height:100%;object-fit:cover;display:block;"></video><span style="position:absolute;top:10px;right:10px;background:rgba(15,23,42,0.8);color:#fff;padding:3px 7px;border-radius:6px;font-size:10px;font-weight:700;">▶ Video</span>`
              : `<img src="${encodeURI(m.url)}" alt="Customer photo by ${escapeHtml(r.authorName || 'Buyer')}" style="width:100%;height:100%;object-fit:cover;display:block;" loading="lazy">`
            }
            <div class="reviora-ugc-tile-overlay" style="position:absolute;bottom:0;left:0;right:0;padding:12px;background:linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 70%, transparent 100%);color:#fff;display:flex;justify-content:space-between;align-items:flex-end;">
              <div>
                <div style="font-weight:700;font-size:12px;">${escapeHtml(r.authorName || "Verified Customer")}</div>
                <div style="font-size:10px;opacity:0.85;">${escapeHtml(r.title || r.body || "Verified Buyer")}</div>
              </div>
              <div style="color:${this.starColor};font-size:11px;letter-spacing:1px;">${renderStarsSvg(r.rating || 5, this.starColor, 11)}</div>
            </div>
          </div>
        `;
      }).join("");

      grid.querySelectorAll(".reviora-ugc-tile").forEach((tile) => {
        tile.onclick = () => {
          const idx = Number(tile.getAttribute("data-media-idx"));
          const item = mediaItems[idx];
          if (item && item.review && item.review.media && item.review.media.length > 0) {
            globalLightbox.open(item.review.media, item.mediaIdx, item.review.authorName);
          }
        };
      });
    }
  }

  if (!customElements.get("reviora-ugc-media-grid")) {
    customElements.define("reviora-ugc-media-grid", RevioraUgcMediaGrid);
  }

  // =========================================================
  // 7. ALL REVIEWS DEDICATED PAGE
  // =========================================================
  class RevioraAllReviewsPage extends HTMLElement {
    connectedCallback() {
      this.shop = this.getAttribute("data-shop") || window.Shopify?.shop || "";
      this.heading = this.getAttribute("data-heading") || "All Store Reviews";
      this.subheading = this.getAttribute("data-subheading") || "Verified customer feedback from across our entire catalog";
      this.starColor = this.getAttribute("data-star-color") || "#FFB800";
      this.accentColor = this.getAttribute("data-accent-color") || "#0F172A";
      this.innerHTML = `
        <div class="reviora-widget-container" style="--reviora-star:${this.starColor};--reviora-primary:${this.accentColor};">
          <div class="reviora-header" style="text-align:center;padding:36px 24px;">
            <h1 style="font-size:28px;font-weight:800;color:#0f172a;margin:0 0 10px 0;">${this.heading}</h1>
            <p style="margin:0 0 20px 0;font-size:14px;color:#64748b;">${this.subheading}</p>
            <div style="display:inline-flex;align-items:center;gap:16px;background:#f8fafc;padding:12px 24px;border-radius:999px;border:1px solid #e2e8f0;">
              <span style="font-size:28px;font-weight:800;color:#0f172a;">4.9</span>
              <div>
                <div>${renderStarsSvg(4.9, this.starColor, 16)}</div>
                <div style="font-size:12px;color:#64748b;">From 1,280 verified buyers</div>
              </div>
            </div>
          </div>
          <div class="reviora-list">
            ${DEMO_CARDS.map((c) => `
              <div class="reviora-card">
                <div class="reviora-card-top">
                  <div class="reviora-author-meta">
                    <div class="reviora-avatar">${c.authorName.slice(0, 2).toUpperCase()}</div>
                    <div class="reviora-author-details">
                      <div class="reviora-author-name-row">
                        <span class="reviora-author">${c.authorName}</span>
                        <span class="reviora-verified-badge">✓ Verified</span>
                      </div>
                      <div>${renderStarsSvg(c.rating || 5, this.starColor, 14)}</div>
                    </div>
                  </div>
                  <span class="reviora-date">Recent order</span>
                </div>
                <h3 class="reviora-card-title">${c.title}</h3>
                <div class="reviora-card-body">${c.body}</div>
              </div>
            `).join("")}
          </div>
        </div>
      `;
    }
  }

  if (!customElements.get("reviora-all-reviews-page")) {
    customElements.define("reviora-all-reviews-page", RevioraAllReviewsPage);
  }

  // =========================================================
  // 8. PRODUCT QUESTIONS & ANSWERS WIDGET
  // =========================================================
  class RevioraQaWidget extends HTMLElement {
    connectedCallback() {
      this.shop =
        this.getAttribute("data-shop") ||
        window.Shopify?.shop ||
        (window.location.hostname.includes("myshopify.com") ? window.location.hostname : "");

      let pId =
        this.getAttribute("data-product-handle") ||
        this.getAttribute("data-product-id") ||
        "";
      if (!pId) {
        const match = window.location.pathname.match(/\/products\/([^/?#]+)/);
        if (match && match[1]) {
          pId = decodeURIComponent(match[1]);
        }
      }
      this.productId = pId || "general";
      this.productHandle = this.getAttribute("data-product-handle") || (pId !== "general" ? pId : "");
      this.productTitle = this.getAttribute("data-product-title") || "";
      this.heading = this.getAttribute("data-heading") || "Customer Questions & Answers";
      this.accentColor = this.getAttribute("data-accent-color") || "#0F172A";
      this.apiUrl =
        cleanBaseUrl(this.getAttribute("data-api-url")) ||
        window.RevioraApiUrl ||
        "https://reviora-ef66.onrender.com";

      this.storageKey = `reviora_qa_${this.shop}_${this.productId}`;

      this.defaultQA = [
        {
          q: "How does the sizing run for this product?",
          asker: "Verified Customer • 2 days ago",
          a: "It fits true to size! If you prefer a more relaxed or loose fit, we recommend ordering one size up.",
          answerer: "Store Team",
          isPending: false,
        },
        {
          q: "Is this item covered under warranty?",
          asker: "Verified Customer • 1 week ago",
          a: "Yes! All authentic items purchased directly from our store are covered by our 1-year replacement warranty.",
          answerer: "Store Team",
          isPending: false,
        },
      ];

      this.serverQuestions = [];
      this.render();
      this.attachListeners();
      this.fetchQuestions();
    }

    async fetchQuestions() {
      if (!this.shop) return;
      try {
        const res = await fetch(
          `${this.apiUrl}/api/qa?shop=${encodeURIComponent(this.shop)}&productId=${encodeURIComponent(this.productId)}`,
          { headers: { Accept: "application/json" } }
        );
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.questions) && data.questions.length > 0) {
            this.serverQuestions = data.questions.map((item) => ({
              q: item.question,
              asker: item.askerName
                ? `${item.askerName} • ${item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Recently"}`
                : "Shopper",
              a: item.answer || "Answer pending...",
              answerer: item.answeredBy || "Store Team",
              isPending: !item.answer,
            }));
            const listEl = this.querySelector("#reviora-qa-list");
            if (listEl) {
              listEl.innerHTML = this.renderQuestionsHtml(this.getAllQuestions());
            }
          }
        }
      } catch (err) {
        console.warn("Reviora QA API fetch fallback:", err);
      }
    }

    getCustomQuestions() {
      try {
        const stored = localStorage.getItem(this.storageKey);
        return stored ? JSON.parse(stored) : [];
      } catch (e) {
        return [];
      }
    }

    saveQuestion(newQ) {
      try {
        const current = this.getCustomQuestions();
        current.unshift(newQ);
        localStorage.setItem(this.storageKey, JSON.stringify(current));
      } catch (e) {
        // ignore
      }
    }

    getAllQuestions() {
      const customLocal = this.getCustomQuestions();
      if (this.serverQuestions && this.serverQuestions.length > 0) {
        return [...customLocal, ...this.serverQuestions];
      }
      if (customLocal.length > 0) {
        return [...customLocal, ...this.defaultQA];
      }
      return this.defaultQA;
    }

    render() {
      const allQuestions = this.getAllQuestions();

      this.innerHTML = `
        <div class="reviora-qa-card" style="--reviora-primary: ${this.accentColor};">
          <div class="reviora-qa-header-row">
            <div>
              <h2 class="reviora-qa-heading">${this.heading}</h2>
              <p class="reviora-qa-subheading">Have questions? Ask our verified community or store staff.</p>
            </div>
            <button type="button" class="reviora-qa-ask-btn" id="reviora-qa-ask-btn">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              Ask a Question
            </button>
          </div>

          <!-- Collapsible Question Form Box -->
          <div id="reviora-qa-form-box" class="reviora-qa-form-box" style="display: none;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <div style="font-size: 16px; font-weight: 700; color: #0f172a;">Ask a Question</div>
              <button type="button" id="reviora-qa-close-form" style="background: none; border: none; font-size: 13px; color: #64748b; cursor: pointer; text-decoration: underline; padding: 4px;">
                Cancel
              </button>
            </div>

            <form id="reviora-qa-form">
              <div class="reviora-qa-form-grid">
                <div>
                  <label style="display: block; font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 6px;">
                    Your Name <span style="color:#ef4444;">*</span>
                  </label>
                  <input type="text" id="reviora-qa-name" class="reviora-qa-input" required placeholder="e.g. Alex M." />
                </div>
                <div>
                  <label style="display: block; font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 6px;">
                    Your Email <span style="color:#ef4444;">*</span>
                  </label>
                  <input type="email" id="reviora-qa-email" class="reviora-qa-input" required placeholder="name@example.com" />
                </div>
              </div>

              <div style="margin-bottom: 16px;">
                <label style="display: block; font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 6px;">
                  What is your question? <span style="color:#ef4444;">*</span>
                </label>
                <textarea id="reviora-qa-text" class="reviora-qa-textarea" required rows="3" placeholder="Ask about sizing, materials, delivery, or warranty..."></textarea>
              </div>

              <div style="display: flex; justify-content: flex-end; align-items: center; gap: 10px;">
                <button type="submit" class="reviora-qa-ask-btn" id="reviora-qa-submit-btn" style="padding: 10px 24px;">
                  Submit Question
                </button>
              </div>
            </form>

            <div id="reviora-qa-success" style="display: none; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 14px 18px; color: #065f46; font-size: 14px; text-align: center; margin-top: 10px;">
              ✓ <strong>Thank you!</strong> Your question has been submitted. Our store staff will answer it shortly.
            </div>
          </div>

          <!-- Questions List -->
          <div class="reviora-qa-list" id="reviora-qa-list">
            ${this.renderQuestionsHtml(allQuestions)}
          </div>
        </div>
      `;
    }

    renderQuestionsHtml(questions) {
      if (!questions || questions.length === 0) {
        return `<div style="text-align:center;padding:24px;color:#94a3b8;font-size:14px;">No questions asked yet. Be the first to ask!</div>`;
      }

      return questions.map((item) => `
        <div class="reviora-qa-item">
          <div class="reviora-qa-item-q">
            <span class="reviora-qa-badge-q">Q</span>
            <div>
              <div class="reviora-qa-q-text">${escapeHtml(item.q)}</div>
              <div class="reviora-qa-asker-meta">Asked by ${escapeHtml(item.asker || "Shopper")}</div>
            </div>
          </div>
          <div class="reviora-qa-item-a" style="${item.isPending ? 'border-left-color: #f59e0b;' : ''}">
            <span class="reviora-qa-badge-a" style="${item.isPending ? 'background: #f59e0b;' : ''}">A</span>
            <div>
              <div class="reviora-qa-a-text">${escapeHtml(item.a)}</div>
              <div class="reviora-qa-answerer-meta" style="${item.isPending ? 'color: #b45309;' : ''}">
                ${item.isPending ? '⏳ Awaiting answer by Store Support' : `✓ Answered by ${escapeHtml(item.answerer || "Store Team")}`}
              </div>
            </div>
          </div>
        </div>
      `).join("");
    }

    attachListeners() {
      const askBtn = this.querySelector("#reviora-qa-ask-btn");
      const formBox = this.querySelector("#reviora-qa-form-box");
      const closeBtn = this.querySelector("#reviora-qa-close-form");
      const form = this.querySelector("#reviora-qa-form");
      const successEl = this.querySelector("#reviora-qa-success");
      const submitBtn = this.querySelector("#reviora-qa-submit-btn");

      if (askBtn && formBox) {
        askBtn.addEventListener("click", () => {
          const isOpen = formBox.style.display !== "none";
          formBox.style.display = isOpen ? "none" : "block";
          if (!isOpen) {
            formBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
            const input = formBox.querySelector("#reviora-qa-name");
            if (input) input.focus();
          }
        });
      }

      if (closeBtn && formBox) {
        closeBtn.addEventListener("click", () => {
          formBox.style.display = "none";
        });
      }

      if (form) {
        form.addEventListener("submit", async (e) => {
          e.preventDefault();
          const nameInput = this.querySelector("#reviora-qa-name");
          const emailInput = this.querySelector("#reviora-qa-email");
          const textInput = this.querySelector("#reviora-qa-text");

          const name = nameInput ? nameInput.value.trim() : "";
          const email = emailInput ? emailInput.value.trim() : "";
          const qText = textInput ? textInput.value.trim() : "";

          if (!name || !email || !qText) return;

          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = "Submitting...";
          }

          const newQuestion = {
            q: qText,
            asker: `${name} • Just now`,
            a: "Thank you for asking! Our support staff has received your question and will answer it shortly.",
            answerer: "Store Support",
            isPending: true,
          };

          this.saveQuestion(newQuestion);

          // Submit question to backend database
          try {
            await fetch(`${this.apiUrl}/api/qa`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
              },
              body: JSON.stringify({
                shop: this.shop,
                productId: this.productId,
                productHandle: this.productHandle || "",
                productTitle: this.productTitle || "",
                question: qText,
                askerName: name,
                askerEmail: email,
              }),
            });
          } catch (err) {
            console.warn("Reviora QA post error:", err);
          }

          if (form) form.style.display = "none";
          if (successEl) successEl.style.display = "block";

          const listEl = this.querySelector("#reviora-qa-list");
          if (listEl) {
            listEl.innerHTML = this.renderQuestionsHtml(this.getAllQuestions());
          }

          setTimeout(() => {
  // If the app embed block is disabled in the theme, do not initialize or display widgets
  if (!window.__REVIORA_APP_EMBED_ENABLED__) {
    const hideAll = () => {
      document.querySelectorAll(
        ".reviora-app-block, .reviora-star-badge-block, reviora-reviews-widget, reviora-reviews-carousel, reviora-floating-tab, reviora-review-popups, reviora-ugc-media-grid, reviora-all-reviews-page, reviora-qa-widget"
      ).forEach((el) => el.style.setProperty("display", "none", "important"));
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", hideAll);
    } else {
      hideAll();
    }
    return;
  }
            if (formBox) formBox.style.display = "none";
            if (form) {
              form.reset();
              form.style.display = "block";
            }
            if (successEl) successEl.style.display = "none";
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.textContent = "Submit Question";
            }
          }, 3500);
        });
      }
    }
  }

  if (!customElements.get("reviora-qa-widget")) {
    customElements.define("reviora-qa-widget", RevioraQaWidget);
  }
})();

