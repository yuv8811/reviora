import { useState } from "react";
import { StarRating } from "./StarRating.jsx";

/**
 * ReviewCard using native App Bridge web components
 */
export function ReviewCard({ review, onApprove, onReject, onReply, onDelete, isLoading, loadingIntent }) {
  const [previewImage, setPreviewImage] = useState(null);
  const topics = review.topics ? JSON.parse(review.topics) : [];

  const formatCapitalize = (str) => {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  const statusUpper = (review.status || "").toUpperCase();
  let statusTone = "info";
  if (statusUpper === "PUBLISHED") statusTone = "success";
  else if (statusUpper === "PENDING") statusTone = "warning";
  else if (statusUpper === "FLAGGED" || statusUpper === "REJECTED" || statusUpper === "SPAM") statusTone = "critical";

  const sentimentUpper = (review.sentiment || "").toUpperCase();
  let sentimentTone = "info";
  if (sentimentUpper === "POSITIVE") sentimentTone = "success";
  else if (sentimentUpper === "NEGATIVE") sentimentTone = "critical";

  const modalId = `photo-modal-${review.id || "preview"}`;

  const openLightbox = (url) => {
    setPreviewImage(url);
    if (window.shopify?.modal) {
      window.shopify.modal.show(modalId);
    } else {
      document.getElementById(modalId)?.showOverlay();
    }
  };

  const closeLightbox = () => {
    if (window.shopify?.modal) {
      window.shopify.modal.hide(modalId);
    } else {
      document.getElementById(modalId)?.hideOverlay();
    }
    setPreviewImage(null);
  };

  return (
    <>
      <s-section>
        <s-stack gap="base">
          {/* Top Header Row */}
          <s-stack direction="inline" justifyContent="space-between" alignItems="center">
            <s-stack direction="inline" gap="small" alignItems="center">
              <StarRating rating={review.rating} size={15} />
              <s-heading>{review.title || "Customer Review"}</s-heading>
              {Boolean(review.verified && review.authorEmail) && (
                <s-badge tone="success">Verified Buyer</s-badge>
              )}
            </s-stack>

            <s-stack direction="inline" gap="small" alignItems="center">
              <s-badge tone={statusTone}>{formatCapitalize(review.status)}</s-badge>
              {review.sentiment && (
                <s-badge tone={sentimentTone}>{formatCapitalize(review.sentiment)}</s-badge>
              )}
            </s-stack>
          </s-stack>

          {/* Author and Product details */}
          <s-text color="subdued">
            By <s-text type="strong">{review.authorName}</s-text> ({review.authorEmail})
            {review.productTitle && ` • on ${review.productTitle}`}
            {` • ${new Date(review.createdAt).toLocaleDateString()}`}
          </s-text>

          {/* Review Body */}
          <s-paragraph>
            {review.body}
          </s-paragraph>

          {/* Attached Media */}
          {review.media && review.media.length > 0 && (
            <s-stack direction="inline" gap="small">
              {review.media.map((m) => (
                <button
                  key={m.id || m.url}
                  type="button"
                  onClick={() => openLightbox(m.url)}
                  title="Click to view full photo"
                  aria-label="Click to enlarge customer photo"
                  style={{
                    border: "1px solid #E1E3E5",
                    background: "#FFFFFF",
                    padding: "2px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <s-thumbnail
                    src={m.url}
                    size="small"
                    alt="Customer upload"
                  ></s-thumbnail>
                </button>
              ))}
            </s-stack>
          )}

          {/* Topics */}
          {topics.length > 0 && (
            <s-stack direction="inline" gap="extra-tight">
              {topics.map((t, idx) => (
                <s-badge key={idx} tone="info">
                  {`#${t}`}
                </s-badge>
              ))}
            </s-stack>
          )}

          {/* Merchant Reply Section */}
          {review.replies && review.replies.length > 0 && (
            <s-box padding="base" background="subdued" border="base" borderRadius="base">
              <s-stack gap="extra-tight">
                <s-text type="strong">Store Owner Response:</s-text>
                <s-paragraph>{review.replies[0].body}</s-paragraph>
              </s-stack>
            </s-box>
          )}

          {/* Actions Row */}
          <s-divider></s-divider>
          <s-stack direction="inline" justifyContent="space-between" alignItems="center">
            <s-stack direction="inline" gap="small" alignItems="center">
              {statusUpper !== "PUBLISHED" && (
                <s-button
                  variant="primary"
                  disabled={isLoading ? true : undefined}
                  loading={isLoading && loadingIntent === "publish" ? true : undefined}
                  onClick={() => onApprove(review.id)}
                >
                  Approve &amp; Publish
                </s-button>
              )}

              {statusUpper !== "REJECTED" && (
                <s-button
                  variant="secondary"
                  tone="critical"
                  disabled={isLoading ? true : undefined}
                  loading={isLoading && loadingIntent === "reject" ? true : undefined}
                  onClick={() => onReject(review.id)}
                >
                  Reject
                </s-button>
              )}

              <s-button
                variant="secondary"
                onClick={() => onReply(review)}
              >
                Reply to Customer
              </s-button>
            </s-stack>

            {onDelete && (
              <s-button
                variant="primary"
                tone="critical"
                onClick={() => onDelete(review)}
              >
                Delete
              </s-button>
            )}
          </s-stack>
        </s-stack>
      </s-section>

      {/* Customer Photo Lightbox Modal */}
      <s-modal
        id={modalId}
        heading="Customer Photo"
      >
        <s-box padding="base">
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "#F6F6F7",
              borderRadius: "8px",
              padding: "16px",
            }}
          >
            {previewImage && (
              <img
                src={previewImage}
                alt="Customer review attachment"
                style={{
                  maxWidth: "100%",
                  maxHeight: "65vh",
                  borderRadius: "6px",
                  objectFit: "contain",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
                }}
              />
            )}
          </div>
        </s-box>
        <s-button
          slot="secondary-actions"
          commandFor={modalId}
          command="--hide"
          onClick={closeLightbox}
        >
          Close
        </s-button>
      </s-modal>
    </>
  );
}
