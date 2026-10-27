/**
 * Modern, responsive skeleton displayed during page-to-page navigation
 */
export function PageSkeleton() {
  return (
    <s-page heading="Loading...">
      <s-stack gap="large">
        {/* Top KPI Cards Skeleton */}
        <s-grid gridTemplateColumns="repeat(auto-fit, minmax(220px, 1fr))" gap="base">
          {[1, 2, 3, 4].map((i) => (
            <s-section key={i}>
              <s-stack gap="small">
                <div style={{ height: "14px", width: "40%", background: "var(--p-color-bg-surface-secondary, #e5e7eb)", borderRadius: "4px" }} />
                <div style={{ height: "28px", width: "70%", background: "var(--p-color-bg-surface-secondary, #e5e7eb)", borderRadius: "4px" }} />
                <div style={{ height: "12px", width: "50%", background: "var(--p-color-bg-surface-secondary, #e5e7eb)", borderRadius: "4px" }} />
              </s-stack>
            </s-section>
          ))}
        </s-grid>

        {/* Main Content Layout Skeleton */}
        <s-grid gridTemplateColumns="2fr 1fr" gap="base">
          <s-section>
            <s-stack gap="base">
              <div style={{ height: "18px", width: "35%", background: "var(--p-color-bg-surface-secondary, #e5e7eb)", borderRadius: "4px" }} />
              <div style={{ height: "14px", width: "90%", background: "var(--p-color-bg-surface-secondary, #e5e7eb)", borderRadius: "4px" }} />
              <div style={{ height: "14px", width: "75%", background: "var(--p-color-bg-surface-secondary, #e5e7eb)", borderRadius: "4px" }} />
              <s-box padding="base" background="subdued" borderRadius="base">
                <s-stack direction="inline" gap="base" alignItems="center">
                  <div style={{ width: "40px", height: "40px", background: "#d1d5db", borderRadius: "6px" }} />
                  <s-stack gap="extra-tight" style={{ flex: 1 }}>
                    <div style={{ height: "14px", width: "50%", background: "#d1d5db", borderRadius: "4px" }} />
                    <div style={{ height: "12px", width: "30%", background: "#d1d5db", borderRadius: "4px" }} />
                  </s-stack>
                </s-stack>
              </s-box>
            </s-stack>
          </s-section>

          <s-section>
            <s-stack gap="base">
              <div style={{ height: "18px", width: "50%", background: "var(--p-color-bg-surface-secondary, #e5e7eb)", borderRadius: "4px" }} />
              <div style={{ height: "14px", width: "80%", background: "var(--p-color-bg-surface-secondary, #e5e7eb)", borderRadius: "4px" }} />
              <div style={{ height: "14px", width: "65%", background: "var(--p-color-bg-surface-secondary, #e5e7eb)", borderRadius: "4px" }} />
            </s-stack>
          </s-section>
        </s-grid>
      </s-stack>
    </s-page>
  );
}
