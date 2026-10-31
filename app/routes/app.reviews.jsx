import { useState, useEffect, useMemo } from "react";
import { useLoaderData, useFetcher, useNavigation, useNavigate } from "react-router";

import { authenticate } from "../shopify.server.js";
import { getAdminReviews, deleteReview, verifyCustomerByEmail, syncProductReviewMetafields } from "../models/review.server.js";
import { getStoreQA, answerQuestion, deleteQuestion } from "../models/qa.server.js";
import { StoreReviews } from "../models/review.model.js";
import { connectDB } from "../db.server.js";
import { ReviewCard } from "../components/ReviewCard.jsx";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "ALL";
  const rating = url.searchParams.get("rating") || "";
  const search = url.searchParams.get("search") || "";
  const page = Number(url.searchParams.get("page") || 1);

  const [reviewData, questions] = await Promise.all([
    getAdminReviews(session.shop, { status, rating, search, page }),
    getStoreQA(session.shop),
  ]);

  // Verify reviewer against existing customer orders by email
  const verifiedReviews = await Promise.all(
    reviewData.reviews.map(async (r) => {
      if (!r.authorEmail) {
        return { ...r, verified: false };
      }
      const isCustomer = await verifyCustomerByEmail(session.shop, r.authorEmail, admin);
      return {
        ...r,
        verified: isCustomer,
      };
    })
  );

  return {
    ...reviewData,
    reviews: verifiedReviews,
    status,
    rating,
    search,
    questions,
  };
};

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  // Q&A Actions
  if (intent === "answerQuestion") {
    const questionId = formData.get("questionId");
    const answerText = formData.get("answerText");
    const answeredBy = formData.get("answeredBy") || "Store Team";
    if (questionId && answerText) {
      await answerQuestion({
        shop: session.shop,
        questionId,
        answer: answerText,
        answeredBy,
      });
      return { success: true, answeredQuestion: true };
    }
    return { error: "Question ID and Answer are required" };
  }

  if (intent === "deleteQuestion") {
    const questionId = formData.get("questionId");
    if (questionId) {
      await deleteQuestion({ shop: session.shop, questionId });
      return { success: true, deletedQuestion: true };
    }
    return { error: "Question ID required" };
  }

  // Reviews Actions
  const reviewId = formData.get("reviewId");
  if (!reviewId) return { error: "Review ID required" };

  await connectDB();

  // Find target review to get product identifier for metafield sync
  const doc = await StoreReviews.findOne(
    { shop: session.shop, "reviews._id": reviewId },
    { "reviews.$": 1 }
  ).lean();
  const targetReview = doc?.reviews?.[0];

  if (intent === "delete") {
    await deleteReview(session.shop, reviewId, admin);
    return { success: true, deleted: true };
  } else if (intent === "publish") {
    await StoreReviews.updateOne(
      { shop: session.shop, "reviews._id": reviewId },
      { $set: { "reviews.$.status": "Published", "reviews.$.updatedAt": new Date() } }
    );
    if (targetReview?.productId || targetReview?.productHandle) {
      await syncProductReviewMetafields({
        shop: session.shop,
        productId: targetReview.productId,
        productHandle: targetReview.productHandle,
        adminClient: admin,
      });
    }
  } else if (intent === "reject") {
    await StoreReviews.updateOne(
      { shop: session.shop, "reviews._id": reviewId },
      { $set: { "reviews.$.status": "REJECTED", "reviews.$.updatedAt": new Date() } }
    );
    if (targetReview?.productId || targetReview?.productHandle) {
      await syncProductReviewMetafields({
        shop: session.shop,
        productId: targetReview.productId,
        productHandle: targetReview.productHandle,
        adminClient: admin,
      });
    }
  } else if (intent === "reply") {
    const replyBody = formData.get("replyBody");
    if (replyBody) {
      await StoreReviews.updateOne(
        { shop: session.shop, "reviews._id": reviewId },
        {
          $push: {
            "reviews.$.replies": {
              body: replyBody,
              author: "Store Owner",
              isAiGenerated: false,
              createdAt: new Date(),
            },
          },
          $set: { "reviews.$.updatedAt": new Date() },
        }
      );
    }
  }

  return { success: true };
};

export default function ReviewsManagerPage() {
  const loaderData = useLoaderData();
  const reviews = useMemo(() => loaderData?.reviews || [], [loaderData?.reviews]);
  const questions = useMemo(() => loaderData?.questions || [], [loaderData?.questions]);
  const status = loaderData?.status || "ALL";
  const search = loaderData?.search || "";
  const fetcher = useFetcher();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const isFiltering = navigation.state === "loading" && navigation.location?.search !== "";

  // Main Tab State: "reviews" | "qa"
  const [activeTab, setActiveTab] = useState("reviews");

  // Reviews filtering & reply state
  const [searchQuery, setSearchQuery] = useState(search || "");
  const [statusFilter, setStatusFilter] = useState(status || "ALL");
  const [selectedReviewForReply, setSelectedReviewForReply] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [reviewToDelete, setReviewToDelete] = useState(null);

  // Q&A answering & filtering state
  const [qaSearchQuery, setQaSearchQuery] = useState("");
  const [qaStatusFilter, setQaStatusFilter] = useState("ALL");
  const [answeringQuestionId, setAnsweringQuestionId] = useState(null);
  const [qaAnswerDraft, setQaAnswerDraft] = useState("");
  const [questionToDelete, setQuestionToDelete] = useState(null);

  const isSubmitting = fetcher.state !== "idle";
  const submittingIntent = fetcher.formData?.get("intent");
  const submittingReviewId = fetcher.formData?.get("reviewId");
  const submittingQuestionId = fetcher.formData?.get("questionId");

  // Automatically reset states when fetcher completes
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.success) {
      setReviewToDelete(null);
      setSelectedReviewForReply(null);
      setReplyText("");
      setQuestionToDelete(null);
      setAnsweringQuestionId(null);
      setQaAnswerDraft("");
    }
  }, [fetcher.state, fetcher.data]);

  const handleApprove = (reviewId) => {
    fetcher.submit({ intent: "publish", reviewId }, { method: "POST" });
  };

  const handleReject = (reviewId) => {
    fetcher.submit({ intent: "reject", reviewId }, { method: "POST" });
  };

  const handleDeleteClick = (review) => {
    setReviewToDelete(review);
    if (window.shopify?.modal) {
      window.shopify.modal.show("delete-review-modal");
    } else {
      document.getElementById("delete-review-modal")?.showOverlay();
    }
  };

  const closeDeleteModal = () => {
    if (window.shopify?.modal) {
      window.shopify.modal.hide("delete-review-modal");
    } else {
      document.getElementById("delete-review-modal")?.hideOverlay();
    }
    setReviewToDelete(null);
  };

  const confirmDelete = () => {
    if (reviewToDelete) {
      const idToDelete = reviewToDelete.id || reviewToDelete._id;
      fetcher.submit({ intent: "delete", reviewId: String(idToDelete) }, { method: "POST" });
      closeDeleteModal();
    }
  };

  // Sync state if loaderData changes from URL
  useEffect(() => {
    if (status) setStatusFilter(status);
  }, [status]);

  useEffect(() => {
    if (search !== undefined) setSearchQuery(search);
  }, [search]);

  // Client-side instant filter on reviews
  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      // 1. Status Filter
      if (statusFilter && statusFilter !== "ALL") {
        const rStatus = String(r.status || "").toUpperCase();
        const fStatus = String(statusFilter).toUpperCase();
        if (rStatus !== fStatus) return false;
      }

      // 2. Search Query Filter
      if (searchQuery && searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const authorName = (r.authorName || "").toLowerCase();
        const authorEmail = (r.authorEmail || "").toLowerCase();
        const title = (r.title || "").toLowerCase();
        const body = (r.body || "").toLowerCase();
        const productTitle = (r.productTitle || "").toLowerCase();

        const matches =
          authorName.includes(q) ||
          authorEmail.includes(q) ||
          title.includes(q) ||
          body.includes(q) ||
          productTitle.includes(q);

        if (!matches) return false;
      }

      return true;
    });
  }, [reviews, statusFilter, searchQuery]);

  const handleClearFilter = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
    if (typeof window === "undefined") return;
    const currentParams = new URLSearchParams(window.location.search);
    currentParams.delete("search");
    currentParams.delete("status");
    currentParams.delete("page");
    navigate(`?${currentParams.toString()}`);
  };

  const handleOpenReply = (review) => {
    setSelectedReviewForReply(review);
    setReplyText("");
  };

  const handleReplySubmit = () => {
    if (!selectedReviewForReply || !replyText.trim()) return;
    fetcher.submit(
      {
        intent: "reply",
        reviewId: selectedReviewForReply.id,
        replyBody: replyText.trim(),
      },
      { method: "POST" }
    );
  };

  // Q&A Handlers
  const handleOpenAnswerForm = (q) => {
    setAnsweringQuestionId(q.id);
    setQaAnswerDraft(q.answer || "");
  };

  const handleCancelAnswer = () => {
    setAnsweringQuestionId(null);
    setQaAnswerDraft("");
  };

  const handlePublishAnswer = (questionId) => {
    if (!qaAnswerDraft.trim()) return;
    fetcher.submit(
      {
        intent: "answerQuestion",
        questionId,
        answerText: qaAnswerDraft.trim(),
        answeredBy: "Store Team",
      },
      { method: "POST" }
    );
  };

  const handleDeleteQuestionClick = (question) => {
    setQuestionToDelete(question);
    if (window.shopify?.modal) {
      window.shopify.modal.show("delete-question-modal");
    } else {
      document.getElementById("delete-question-modal")?.showOverlay();
    }
  };

  const closeDeleteQuestionModal = () => {
    if (window.shopify?.modal) {
      window.shopify.modal.hide("delete-question-modal");
    } else {
      document.getElementById("delete-question-modal")?.hideOverlay();
    }
    setQuestionToDelete(null);
  };

  const confirmDeleteQuestion = () => {
    if (questionToDelete) {
      fetcher.submit(
        {
          intent: "deleteQuestion",
          questionId: questionToDelete.id,
        },
        { method: "POST" }
      );
      closeDeleteQuestionModal();
    }
  };

  const statusOptions = [
    { label: "All Statuses", value: "ALL" },
    { label: "Published", value: "Published" },
    { label: "Pending", value: "PENDING" },
    { label: "Rejected", value: "REJECTED" },
    { label: "Flagged", value: "FLAGGED" },
  ];

  // Filtered Q&A items
  const filteredQuestions = questions.filter((q) => {
    if (qaStatusFilter !== "ALL" && q.status !== qaStatusFilter) return false;
    if (qaSearchQuery.trim()) {
      const qLower = qaSearchQuery.toLowerCase();
      const matchQ = (q.question || "").toLowerCase().includes(qLower);
      const matchAsker = (q.askerName || "").toLowerCase().includes(qLower);
      const matchEmail = (q.askerEmail || "").toLowerCase().includes(qLower);
      const matchProd = (q.productTitle || "").toLowerCase().includes(qLower);
      const matchAns = (q.answer || "").toLowerCase().includes(qLower);
      return matchQ || matchAsker || matchEmail || matchProd || matchAns;
    }
    return true;
  });

  const unansweredQaCount = questions.filter((q) => q.status === "UNANSWERED").length;

  return (
    <s-page heading="Moderation Inbox">
      <s-button slot="primary-action" variant="primary" onClick={() => navigate("/app/import")}>
        Import &amp; Export
      </s-button>

      <s-stack gap="base">
        {/* Navigation Tabs between Reviews & Q/A */}
        <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px" }}>
          <button
            type="button"
            onClick={() => setActiveTab("reviews")}
            style={{
              padding: "8px 18px",
              borderRadius: "8px",
              border: activeTab === "reviews" ? "1px solid #0f172a" : "1px solid #e2e8f0",
              background: activeTab === "reviews" ? "#0f172a" : "#ffffff",
              color: activeTab === "reviews" ? "#ffffff" : "#475569",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.15s ease",
            }}
          >
            <span>Customer Reviews</span>
            <span
              style={{
                backgroundColor: activeTab === "reviews" ? "rgba(255,255,255,0.2)" : "#f1f5f9",
                color: activeTab === "reviews" ? "#ffffff" : "#475569",
                borderRadius: "12px",
                padding: "2px 8px",
                fontSize: "12px",
                fontWeight: "700",
              }}
            >
              {filteredReviews.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("qa")}
            style={{
              padding: "8px 18px",
              borderRadius: "8px",
              border: activeTab === "qa" ? "1px solid #0f172a" : "1px solid #e2e8f0",
              background: activeTab === "qa" ? "#0f172a" : "#ffffff",
              color: activeTab === "qa" ? "#ffffff" : "#475569",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.15s ease",
            }}
          >
            <span>Product Q&amp;A</span>
            <span
              style={{
                backgroundColor: unansweredQaCount > 0 ? (activeTab === "qa" ? "#f59e0b" : "#fef3c7") : (activeTab === "qa" ? "rgba(255,255,255,0.2)" : "#f1f5f9"),
                color: unansweredQaCount > 0 ? (activeTab === "qa" ? "#ffffff" : "#b45309") : (activeTab === "qa" ? "#ffffff" : "#475569"),
                borderRadius: "12px",
                padding: "2px 8px",
                fontSize: "12px",
                fontWeight: "700",
              }}
            >
              {unansweredQaCount > 0 ? `${unansweredQaCount} Unanswered` : questions.length}
            </span>
          </button>
        </div>

        {/* ========================================================
            TAB 1: REVIEWS MODERATION
        ======================================================== */}
        {activeTab === "reviews" && (
          <>
            {/* Filters Card */}
            <s-section>
              <s-grid gridTemplateColumns="1fr 220px auto" gap="small" alignItems="end">
                <s-text-field
                  label="Search Reviews"
                  value={searchQuery}
                  onInput={(e) => setSearchQuery(e.target.value)}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search reviewer name, email, or keywords..."
                />

                <s-select
                  label="Filter by Status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  {statusOptions.map((opt) => (
                    <s-option key={opt.value} value={opt.value}>
                      {opt.label}
                    </s-option>
                  ))}
                </s-select>

                {(searchQuery || statusFilter !== "ALL") && (
                  <s-button variant="primary" tone="critical" onClick={handleClearFilter} disabled={isFiltering ? true : undefined}>
                    Clear
                  </s-button>
                )}
              </s-grid>
            </s-section>

            {/* Interactive Reply Section */}
            {selectedReviewForReply && (
              <s-section>
                <s-stack gap="base">
                  <s-heading size="small">
                    Reply to {selectedReviewForReply.authorName}
                  </s-heading>

                  <s-banner tone="info" heading="Customer Review">
                    <s-paragraph>&ldquo;{selectedReviewForReply.body}&rdquo;</s-paragraph>
                  </s-banner>

                  <s-text-field
                    label="Your Public Response"
                    value={replyText}
                    onInput={(e) => setReplyText(e.target.value)}
                    multiline="3"
                  />

                  <s-stack direction="inline" gap="small">
                    <s-button
                      variant="primary"
                      loading={isSubmitting && submittingIntent === "reply" ? true : undefined}
                      onClick={handleReplySubmit}
                    >
                      Post Public Response
                    </s-button>
                    <s-button
                      variant="secondary"
                      disabled={isSubmitting && submittingIntent === "reply" ? true : undefined}
                      onClick={() => setSelectedReviewForReply(null)}
                    >
                      Cancel
                    </s-button>
                  </s-stack>
                </s-stack>
              </s-section>
            )}

            {/* Review Cards Listing */}
            {filteredReviews.length === 0 ? (
              <s-section>
                <s-box padding="large">
                  <s-stack gap="extra-tight" alignItems="center">
                    <s-text tone="subdued" weight="semibold">
                      No reviews match your filters
                    </s-text>
                    <s-text tone="subdued" size="small">
                      Try adjusting your search criteria or switch status to &ldquo;All Statuses&rdquo;.
                    </s-text>
                  </s-stack>
                </s-box>
              </s-section>
            ) : (
              <s-stack gap="base">
                {filteredReviews.map((r) => (
                  <ReviewCard
                    key={r.id}
                    review={r}
                    isLoading={isSubmitting && submittingReviewId === r.id}
                    loadingIntent={submittingReviewId === r.id ? submittingIntent : null}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onDelete={() => handleDeleteClick(r)}
                    onReply={handleOpenReply}
                  />
                ))}
              </s-stack>
            )}
          </>
        )}

        {/* ========================================================
            TAB 2: PRODUCT Q&A MODERATION & ANSWERING
        ======================================================== */}
        {activeTab === "qa" && (
          <>
            {/* Q&A Filter Bar */}
            <s-section>
              <s-grid gridTemplateColumns="1fr 200px auto" gap="small" alignItems="end">
                <s-text-field
                  label="Search Questions"
                  value={qaSearchQuery}
                  onInput={(e) => setQaSearchQuery(e.target.value)}
                  placeholder="Search question, customer, product..."
                />

                <s-select
                  label="Filter by Status"
                  value={qaStatusFilter}
                  onChange={(e) => setQaStatusFilter(e.target.value)}
                >
                  <s-option value="ALL">All Questions</s-option>
                  <s-option value="UNANSWERED">Unanswered</s-option>
                  <s-option value="PUBLISHED">Published</s-option>
                </s-select>

                {(qaSearchQuery || qaStatusFilter !== "ALL") && (
                  <s-button
                    variant="secondary"
                    onClick={() => {
                      setQaSearchQuery("");
                      setQaStatusFilter("ALL");
                    }}
                  >
                    Clear Filter
                  </s-button>
                )}
              </s-grid>
            </s-section>

            {/* Questions Listing */}
            {filteredQuestions.length === 0 ? (
              <s-section>
                <s-box padding="large">
                  <s-stack gap="extra-tight" alignItems="center">
                    <s-text tone="subdued" weight="semibold">
                      No customer questions found
                    </s-text>
                    <s-paragraph color="subdued">
                      Questions submitted by shoppers through the Product Q&amp;A widget will appear here for you to review and answer.
                    </s-paragraph>
                  </s-stack>
                </s-box>
              </s-section>
            ) : (
              <s-stack gap="base">
                {filteredQuestions.map((q) => {
                  const isAnswering = answeringQuestionId === q.id;
                  const isSavingThisAnswer = isSubmitting && submittingIntent === "answerQuestion" && submittingQuestionId === q.id;

                  return (
                    <s-section key={q.id}>
                      <s-stack gap="base">
                        {/* Header: Product & Asker Info */}
                        <s-stack direction="inline" justifyContent="space-between" alignItems="center" wrap="wrap" gap="small">
                          <div>
                            <s-stack direction="inline" gap="small" alignItems="center">
                              {q.productTitle && (
                                <s-badge tone="info">{q.productTitle}</s-badge>
                              )}
                              <s-badge tone={q.status === "PUBLISHED" ? "success" : "warning"}>
                                {q.status === "PUBLISHED" ? "Published" : "Unanswered"}
                              </s-badge>
                            </s-stack>
                            <div style={{ marginTop: "4px", fontSize: "12px", color: "#64748b" }}>
                              Asked by <strong style={{ color: "#0f172a" }}>{q.askerName}</strong> ({q.askerEmail}) • {new Date(q.createdAt).toLocaleString()}
                            </div>
                          </div>

                          <s-stack direction="inline" gap="small">
                            {!isAnswering && (
                              <s-button
                                variant={q.status === "PUBLISHED" ? "secondary" : "primary"}
                                onClick={() => handleOpenAnswerForm(q)}
                              >
                                {q.status === "PUBLISHED" ? "Edit Answer" : "Answer Question"}
                              </s-button>
                            )}
                            <s-button
                              variant="secondary"
                              tone="critical"
                              onClick={() => handleDeleteQuestionClick(q)}
                            >
                              Delete
                            </s-button>
                          </s-stack>
                        </s-stack>

                        <s-divider></s-divider>

                        {/* The Question Text */}
                        <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                          <span
                            style={{
                              backgroundColor: "#0ea5e9",
                              color: "#ffffff",
                              borderRadius: "6px",
                              padding: "2px 8px",
                              fontSize: "12px",
                              fontWeight: "800",
                              flexShrink: 0,
                              marginTop: "2px",
                            }}
                          >
                            Q
                          </span>
                          <div style={{ fontSize: "15px", fontWeight: "600", color: "#0f172a", lineHeight: "1.4" }}>
                            {q.question}
                          </div>
                        </div>

                        {/* Inline Answer Editor */}
                        {isAnswering ? (
                          <div
                            style={{
                              backgroundColor: "#f8fafc",
                              border: "1px solid #cbd5e1",
                              borderRadius: "10px",
                              padding: "16px",
                              marginTop: "6px",
                            }}
                          >
                            <s-stack gap="small">
                              <s-text weight="bold">Your Public Store Answer:</s-text>
                              <s-text-field
                                multiline="3"
                                value={qaAnswerDraft}
                                onInput={(e) => setQaAnswerDraft(e.target.value)}
                                placeholder="Type your official answer here. It will display on your product page..."
                              />
                              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                                <s-button variant="secondary" onClick={handleCancelAnswer} disabled={isSavingThisAnswer}>
                                  Cancel
                                </s-button>
                                <s-button
                                  variant="primary"
                                  loading={isSavingThisAnswer}
                                  onClick={() => handlePublishAnswer(q.id)}
                                >
                                  Publish Answer ↗
                                </s-button>
                              </div>
                            </s-stack>
                          </div>
                        ) : (
                          /* Display Existing Published Answer */
                          q.status === "PUBLISHED" && q.answer ? (
                            <div
                              style={{
                                display: "flex",
                                alignItems: "flex-start",
                                gap: "10px",
                                paddingLeft: "14px",
                                borderLeft: "3px solid #10b981",
                                marginLeft: "6px",
                                marginTop: "4px",
                              }}
                            >
                              <span
                                style={{
                                  backgroundColor: "#10b981",
                                  color: "#ffffff",
                                  borderRadius: "6px",
                                  padding: "2px 8px",
                                  fontSize: "12px",
                                  fontWeight: "800",
                                  flexShrink: 0,
                                  marginTop: "2px",
                                }}
                              >
                                A
                              </span>
                              <div>
                                <div style={{ fontSize: "14px", color: "#334155", lineHeight: "1.5" }}>
                                  {q.answer}
                                </div>
                                <div style={{ fontSize: "12px", color: "#059669", fontWeight: "600", marginTop: "4px" }}>
                                  ✓ Answered by {q.answeredBy || "Store Team"}
                                  {q.answeredAt && ` on ${new Date(q.answeredAt).toLocaleDateString()}`}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <s-banner tone="warning">
                              <s-paragraph>
                                This question has not been answered yet. Click <strong>Answer Question</strong> above to write an answer and publish it to your store.
                              </s-paragraph>
                            </s-banner>
                          )
                        )}
                      </s-stack>
                    </s-section>
                  );
                })}
              </s-stack>
            )}
          </>
        )}
      </s-stack>

      {/* Delete Review Modal */}
      <s-modal
        id="delete-review-modal"
        heading="Delete Review?"
        onClose={closeDeleteModal}
      >
        <s-stack gap="base">
          <s-paragraph>
            Are you sure you want to permanently delete this review by{" "}
            <s-text weight="bold">{reviewToDelete?.authorName || "this customer"}</s-text>? This action cannot be undone.
          </s-paragraph>
          {reviewToDelete?.title && (
            <s-banner tone="warning" heading="Review Title">
              <s-paragraph>&ldquo;{reviewToDelete.title}&rdquo;</s-paragraph>
            </s-banner>
          )}
        </s-stack>
        <s-button
          slot="primary-action"
          variant="primary"
          tone="critical"
          loading={isSubmitting && submittingIntent === "delete" ? true : undefined}
          onClick={confirmDelete}
        >
          Delete Review
        </s-button>
        <s-button
          slot="secondary-actions"
          variant="secondary"
          onClick={closeDeleteModal}
        >
          Cancel
        </s-button>
      </s-modal>

      {/* Delete Question Modal */}
      <s-modal
        id="delete-question-modal"
        heading="Delete Question?"
        onClose={closeDeleteQuestionModal}
      >
        <s-stack gap="base">
          <s-paragraph>
            Are you sure you want to delete this question asked by{" "}
            <s-text weight="bold">{questionToDelete?.askerName || "this customer"}</s-text>?
          </s-paragraph>
          {questionToDelete?.question && (
            <s-banner tone="warning" heading="Question">
              <s-paragraph>&ldquo;{questionToDelete?.question}&rdquo;</s-paragraph>
            </s-banner>
          )}
        </s-stack>
        <s-button
          slot="primary-action"
          variant="primary"
          tone="critical"
          loading={isSubmitting && submittingIntent === "deleteQuestion" ? true : undefined}
          onClick={confirmDeleteQuestion}
        >
          Delete Question
        </s-button>
        <s-button
          slot="secondary-actions"
          variant="secondary"
          onClick={closeDeleteQuestionModal}
        >
          Cancel
        </s-button>
      </s-modal>
    </s-page>
  );
}
