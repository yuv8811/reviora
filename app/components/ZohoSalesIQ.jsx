import { useEffect } from "react";

export function ZohoSalesIQ() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    window.$zoho = window.$zoho || {};
    window.$zoho.salesiq = window.$zoho.salesiq || {
      values: {},
      ready: function () {
        try {
          if (window.$zoho?.salesiq?.floatbutton) {
            window.$zoho.salesiq.floatbutton.visible("show");
          }
        } catch (e) {
          console.warn("Zoho SalesIQ floatbutton error:", e);
        }
      },
    };

    // Inject style to hide Zoho branding elements (.flogo, .siqcw-drivenby)
    const styleId = "hide-zoho-branding";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        .flogo,
        .siqcw-drivenby,
        .flogo.siqcw-drivenby,
        [class*="siqcw-drivenby"],
        [class*="flogo"] {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
          height: 0 !important;
          width: 0 !important;
          overflow: hidden !important;
        }
      `;
      document.head.appendChild(style);
    }

    const hideDrivenByElements = () => {
      try {
        const els = document.querySelectorAll(".flogo, .siqcw-drivenby, [class*='siqcw-drivenby']");
        els.forEach((el) => {
          el.style.setProperty("display", "none", "important");
          el.style.setProperty("visibility", "hidden", "important");
        });

        // Also check any child/shadow iframes if accessible
        const iframes = document.querySelectorAll("iframe");
        iframes.forEach((iframe) => {
          try {
            const doc = iframe.contentDocument || iframe.contentWindow?.document;
            if (doc) {
              const innerEls = doc.querySelectorAll(".flogo, .siqcw-drivenby, [class*='siqcw-drivenby']");
              innerEls.forEach((el) => {
                el.style.setProperty("display", "none", "important");
                el.style.setProperty("visibility", "hidden", "important");
              });
              if (!doc.getElementById("hide-zoho-branding-inner")) {
                const innerStyle = doc.createElement("style");
                innerStyle.id = "hide-zoho-branding-inner";
                innerStyle.textContent = `
                  .flogo, .siqcw-drivenby, .flogo.siqcw-drivenby, [class*="siqcw-drivenby"] {
                    display: none !important;
                    visibility: hidden !important;
                    height: 0 !important;
                    overflow: hidden !important;
                  }
                `;
                doc.head?.appendChild(innerStyle);
              }
            }
          } catch {
            // cross-origin iframe security, ignore
          }
        });
      } catch {
        // ignore
      }
    };

    // If script already exists in the document, force show
    if (document.getElementById("zsiqscript")) {
      try {
        if (window.$zoho?.salesiq?.floatbutton) {
          window.$zoho.salesiq.floatbutton.visible("show");
        }
      } catch (e) {
        // 
      }
      return;
    }

    // Dynamically inject script after React hydration
    const script = document.createElement("script");
    script.id = "zsiqscript";
    script.type = "text/javascript";
    script.defer = true;
    script.src =
      "https://salesiq.zoho.in/widget?wc=siq6016267f469251dc0bb446d4dff99736b53046b0c085b766490cb5100220b4ad";

    document.body.appendChild(script);

    hideDrivenByElements();

    // Ensure it remains visible if SalesIQ attempts to auto-hide inside an iframe, and hide branding
    const interval = setInterval(() => {
      try {
        if (window.$zoho?.salesiq?.floatbutton) {
          window.$zoho.salesiq.floatbutton.visible("show");
        }
        hideDrivenByElements();
      } catch (e) {
        // 
      }
    }, 1000);

    const timeout = setTimeout(() => {
      clearInterval(interval);
    }, 15000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  return null;
}
