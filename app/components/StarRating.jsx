import { Star } from "lucide-react";

/**
 * StarRating component using App Bridge s-stack and s-text
 */
export function StarRating({ rating = 5, size = 16, showNumber = false }) {
  const fullStars = Math.max(0, Math.min(5, Math.round(rating)));

  return (
    <s-stack direction="inline" gap="extra-tight" alignItems="center">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          fill={i <= fullStars ? "#FFB800" : "#E5E7EB"}
          color={i <= fullStars ? "#FFB800" : "#D1D5DB"}
          strokeWidth={1.5}
        />
      ))}
      {showNumber && (
        <s-text size="small" weight="semibold">
          {rating.toFixed(1)}
        </s-text>
      )}
    </s-stack>
  );
}
