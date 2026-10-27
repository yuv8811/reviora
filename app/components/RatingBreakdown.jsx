/**
 * RatingBreakdown component built using native App Bridge web components
 */
export function RatingBreakdown({ distribution, total = 0, averageRating = 0 }) {
  const safeTotal = total > 0 ? total : 1;

  return (
    <s-section>
      <s-stack gap="base">
        <s-stack direction="inline" justifyContent="space-between" alignItems="center">
          <s-heading>Rating Distribution</s-heading>
          <s-stack direction="inline" gap="extra-tight" alignItems="center">
            {averageRating > 0 && (
              <s-badge tone="success">{`★ ${averageRating}`}</s-badge>
            )}
            <s-badge tone="info">{`${total} Total Reviews`}</s-badge>
          </s-stack>
        </s-stack>

        <s-stack gap="extra-tight">
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = distribution[stars] || 0;
            const pct = Math.round((count / safeTotal) * 100);

            return (
              <s-grid key={stars} gridTemplateColumns="65px 1fr 35px" alignItems="center" gap="small">
                <s-text type="strong">
                  {`${stars} ${stars === 1 ? "Star" : "Stars"}`}
                </s-text>
                <s-progress max={100} value={pct} accessibilityLabel={`${stars} stars progress`}></s-progress>
                <s-text color="subdued">
                  {count}
                </s-text>
              </s-grid>
            );
          })}
        </s-stack>
      </s-stack>
    </s-section>
  );
}
