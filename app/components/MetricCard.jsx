/**
 * Metric KPI Card built using native App Bridge web components
 */
export function MetricCard({ label, value, subtext, icon: Icon, tone = "default" }) {
  const isSubdued = tone === "default";

  return (
    <s-section>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <s-stack direction="inline" justifyContent="space-between" alignItems="center">
          <s-text color="subdued">{label}</s-text>
          {Icon && (
            <s-box padding="extra-tight">
              <Icon size={16} />
            </s-box>
          )}
        </s-stack>

        {/* <s-heading size="large">{value}</s-heading> */}
        <h1 style={{ fontSize: "24px", fontWeight: "bold" }}>{value}</h1>

        {subtext && (
          <s-text color={isSubdued ? "subdued" : undefined}>
            {subtext}
          </s-text>
        )}
      </div>
    </s-section>
  );
}
