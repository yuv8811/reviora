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

    // Ensure it remains visible if SalesIQ attempts to auto-hide inside an iframe
    const interval = setInterval(() => {
      try {
        if (window.$zoho?.salesiq?.floatbutton) {
          window.$zoho.salesiq.floatbutton.visible("show");
        }
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
