import { redirect } from "react-router";
import { authenticate } from "../shopify.server.js";

// Review Requests feature is temporarily commented out
export const loader = async ({ request }) => {
  await authenticate.admin(request);
  const url = new URL(request.url);
  return redirect(`/app${url.search}`);
};

export default function RequestsPage() {
  return null;
}

// =========================================================================
// REVIEW REQUESTS (TEMPORARILY COMMENTED OUT)
// To restore, delete the code above and remove '// ' from the lines below.
// =========================================================================
// import { useState, useEffect, useMemo } from "react";
// import process from "process";
// import { useLoaderData, useFetcher, useSubmit, useNavigation } from "react-router";
// import { CheckCircle2 } from "lucide-react";
// 
// import { authenticate } from "../shopify.server.js";
// import { ReviewRequest } from "../models/reviewRequest.model.js";
// import { connectDB } from "../db.server.js";
// import { getShopSettings } from "../models/review.server.js";
// import { sendReviewRequestEmail } from "../utils/email.server.js";
// import { GET_RECENT_ORDERS_QUERY } from "../graphql/index.js";
// 
// export const loader = async ({ request }) => {
//   const { admin, billing, session } = await authenticate.admin(request);
//   await connectDB();
// 
//   let isPro = false;
//   try {
//     const isTest = process.env.NODE_ENV !== "production";
//     const billingCheck = await billing.check({
//       plans: ["Pro"],
//       isTest,
//     });
//     isPro = Boolean(billingCheck.hasActivePayment);
//   } catch {
//     try {
//       const settings = await getShopSettings(session.shop);
//       isPro = settings?.plan === "PRO";
//     } catch {
//       // ignore
//     }
//   }
// 
//   const url = new URL(request.url);
//   const q = url.searchParams.get("q")?.trim() || "";
// 
//   let orders = [];
//   try {
//     // Lean 20 orders to keep page transitions super snappy
//     const variables = { first: 20 };
//     if (q) {
//       variables.query = q;
//     }
// 
//     const response = await admin.graphql(GET_RECENT_ORDERS_QUERY, {
//       variables,
//     });
// 
//     const json = await response.json();
//     const rawNodes = json.data?.orders?.nodes || [];
// 
//     // Strictly keep only delivered & fulfilled orders
//     const fulfilledNodes = rawNodes.filter(
//       (o) => o.displayFulfillmentStatus === "FULFILLED"
//     );
// 
//     orders = fulfilledNodes.map((o) => {
//       const customerName =
//         o.customer?.displayName ||
//         [o.customer?.firstName, o.customer?.lastName].filter(Boolean).join(" ") ||
//         "Valued Customer";
// 
//       const customerEmail = o.customer?.email || o.email || "";
// 
//       const items = (o.lineItems?.nodes || []).map((li) => ({
//         id: li.id,
//         title: li.title,
//         productId: li.product?.handle || (li.product?.id ? li.product.id.replace("gid://shopify/Product/", "") : ""),
//         productHandle: li.product?.handle || "",
//       }));
// 
//       return {
//         id: o.id,
//         orderNumber: o.name,
//         createdAt: o.createdAt,
//         fulfillmentStatus: o.displayFulfillmentStatus || "FULFILLED",
//         financialStatus: o.displayFinancialStatus || "PAID",
//         customerName,
//         customerEmail,
//         items,
//       };
//     });
//   } catch (err) {
//     console.error("âš ï¸ Failed to fetch Shopify orders:", err);
//   }
// 
//   const rawRequests = await ReviewRequest.find({ shop: session.shop })
//     .sort({ createdAt: -1 })
//     .limit(50)
//     .lean({ virtuals: true });
// 
//   const requests = rawRequests.map((r) => ({
//     ...r,
//     id: r.id || r._id.toString(),
//   }));
// 
//   return { requests, orders, searchQuery: q, isPro, shop: session.shop };
// };
// 
// export const action = async ({ request }) => {
//   const { session, billing } = await authenticate.admin(request);
//   const formData = await request.formData();
//   const intent = formData.get("intent");
// 
//   if (intent === "send_manual") {
//     let isPro = false;
//     try {
//       const isTest = process.env.NODE_ENV !== "production";
//       const billingCheck = await billing.check({
//         plans: ["Pro"],
//         isTest,
//       });
//       isPro = Boolean(billingCheck.hasActivePayment);
//     } catch {
//       try {
//         const settings = await getShopSettings(session.shop);
//         isPro = settings?.plan === "PRO";
//       } catch {
//         // ignore
//       }
//     }
// 
//     if (!isPro) {
//       return {
//         error: "Customer Review Requests is an exclusive Reviora Pro feature ($4.99/mo). Please upgrade your subscription to send review invitations.",
//       };
//     }
// 
//     const orderId = formData.get("orderId") || `MANUAL-${Date.now()}`;
//     const customerEmail = formData.get("customerEmail")?.trim();
//     const customerName = formData.get("customerName")?.trim() || "Valued Customer";
//     const productTitle = formData.get("productTitle")?.trim() || "Item";
//     const productHandle = formData.get("productHandle")?.trim() || "";
//     const rawProductId = formData.get("productId")?.trim() || "";
//     const productId = productHandle || rawProductId || "general-product";
// 
//     if (!customerEmail) return { error: "Customer email is required" };
// 
//     const token =
//       Math.random().toString(36).substring(2, 15) +
//       Math.random().toString(36).substring(2, 15);
// 
//     // Send real email via Resend
//     const emailResult = await sendReviewRequestEmail({
//       to: customerEmail,
//       customerName,
//       productTitle,
//       productHandle,
//       shop: session.shop,
//       token,
//     });
// 
//     const status = emailResult.success ? "SENT" : "FAILED";
// 
//     await connectDB();
//     await ReviewRequest.create({
//       shop: session.shop,
//       orderId,
//       customerEmail,
//       customerName,
//       productId,
//       productTitle,
//       channel: "EMAIL",
//       status,
//       errorMessage: emailResult.error || undefined,
//       scheduledAt: new Date(),
//       sentAt: emailResult.success ? new Date() : undefined,
//       token,
//     });
// 
//     if (!emailResult.success) {
//       return {
//         warning: `Recorded in history, but email dispatch failed: ${emailResult.error}`,
//       };
//     }
// 
//     return {
//       success: true,
//       message: `Review invitation sent to ${customerEmail} for "${productTitle}"!`,
//     };
//   }
// 
//   return null;
// };
// 
// export default function RequestsPage() {
//   const loaderData = useLoaderData();
//   const requests = loaderData?.requests || [];
//   const orders = useMemo(() => loaderData?.orders || [], [loaderData?.orders]);
//   const searchQuery = loaderData?.searchQuery || "";
//   const isPro = Boolean(loaderData?.isPro);
//   const fetcher = useFetcher();
//   const submit = useSubmit();
//   const navigation = useNavigation();
//   const isSending = fetcher.state === "submitting";
//   const isSearching = navigation.state === "loading" && navigation.location?.search !== "";
// 
//   // Pro modal controls
//   const handleOpenProModal = () => {
//     if (window.shopify?.modal) {
//       window.shopify.modal.show("upgrade-pro-modal");
//     } else {
//       document.getElementById("upgrade-pro-modal")?.showOverlay();
//     }
//   };
// 
//   const handleCloseProModal = () => {
//     if (window.shopify?.modal) {
//       window.shopify.modal.hide("upgrade-pro-modal");
//     } else {
//       document.getElementById("upgrade-pro-modal")?.hideOverlay();
//     }
//   };
// 
//   const handleNavigateToBilling = () => {
//     window.location.href = "/app/billing";
//   };
// 
//   // Search input state
//   const [searchInput, setSearchInput] = useState(searchQuery);
// 
//   // Selection states
//   const [selectedOrderId, setSelectedOrderId] = useState("");
//   const [customerName, setCustomerName] = useState("");
//   const [customerEmail, setCustomerEmail] = useState("");
//   const [orderNumber, setOrderNumber] = useState("");
//   const [selectedProductIndex, setSelectedProductIndex] = useState(0);
// 
//   const currentOrder = orders.find((o) => o.id === selectedOrderId);
// 
//   // Update selection if orders change
//   useEffect(() => {
//     if (orders.length > 0 && selectedOrderId && !orders.some((o) => o.id === selectedOrderId)) {
//       setSelectedOrderId("");
//     } else if (orders.length === 0) {
//       setSelectedOrderId("");
//     }
//   }, [orders, selectedOrderId]);
// 
//   // Auto-fill customer and products whenever the selected order changes
//   useEffect(() => {
//     if (currentOrder) {
//       setCustomerName(currentOrder.customerName || "");
//       setCustomerEmail(currentOrder.customerEmail || "");
//       setOrderNumber(currentOrder.orderNumber || "");
//       setSelectedProductIndex(0);
//     } else {
//       setCustomerName("");
//       setCustomerEmail("");
//       setOrderNumber("");
//     }
//   }, [selectedOrderId, currentOrder]);
// 
//   const currentProduct =
//     currentOrder && currentOrder.items && currentOrder.items.length > 0
//       ? currentOrder.items[selectedProductIndex]
//       : null;
// 
//   const handleSearchSubmit = (e) => {
//     if (e && e.preventDefault) e.preventDefault();
//     submit({ q: searchInput }, { method: "GET" });
//   };
// 
//   const handleClearSearch = () => {
//     setSearchInput("");
//     submit({}, { method: "GET" });
//   };
// 
//   const handleSend = () => {
//     if (!isPro) {
//       handleOpenProModal();
//       return;
//     }
//     if (!currentOrder || !currentProduct) return;
//     fetcher.submit(
//       {
//         intent: "send_manual",
//         orderId: currentOrder.orderNumber || orderNumber,
//         productTitle: currentProduct.title,
//         productId: currentProduct.productId || "custom-product",
//         productHandle: currentProduct.productHandle || "",
//         customerName,
//         customerEmail,
//       },
//       { method: "POST" }
//     );
//   };
// 
//   return (
//     <s-page heading="Review Requests">
//       <s-stack gap="base">
//         {/* Banner Feedback */}
//         {fetcher.data?.message && (
//           <s-banner tone="success" heading="Success">
//             <s-paragraph>{fetcher.data.message}</s-paragraph>
//           </s-banner>
//         )}
// 
//         {(fetcher.data?.warning || fetcher.data?.error) && (
//           <s-banner tone="critical" heading="Subscription / Delivery Notice">
//             <s-paragraph>{fetcher.data.warning || fetcher.data.error}</s-paragraph>
//           </s-banner>
//         )}
// 
//         {/* PRO Banner for Free Merchants */}
//         {!isPro && (
//           <s-banner tone="warning" heading="PRO Feature: Upgrade Required">
//             <s-stack gap="tight">
//               <s-paragraph>
//                 <strong>Customer Review Requests</strong> is an exclusive <strong>Reviora Pro</strong> feature ($4.99/month). You can search and view delivered orders below, but an active Pro plan is required to send automated and manual email invitations.
//               </s-paragraph>
//               <div style={{ marginTop: "4px" }}>
//                 <s-button variant="primary" onClick={handleOpenProModal}>
//                   Upgrade to Pro Plan â†—
//                 </s-button>
//               </div>
//             </s-stack>
//           </s-banner>
//         )}
// 
//         {/* Section 1: Send Invitation by Order */}
//         <s-section>
//           <s-stack gap="base">
//             <s-stack direction="inline" justifyContent="space-between" alignItems="center">
//               <s-stack gap="extra-tight">
//                 <s-heading size="small">Send Review Invitation by Order</s-heading>
//                 <s-text tone="subdued" size="small">
//                   Select or search delivered and fulfilled orders from your store to automatically populate customer and product details.
//                 </s-text>
//               </s-stack>
//               <s-badge tone={isPro ? "success" : "warning"}>
//                 {isPro ? "PRO Active" : "PRO Feature"}
//               </s-badge>
//             </s-stack>
// 
//             {/* Order Search Bar */}
//             <s-grid gridTemplateColumns="1fr auto auto" gap="small" alignItems="end">
//               <s-text-field
//                 label="Search Delivered Orders"
//                 value={searchInput}
//                 onInput={(e) => setSearchInput(e.target.value)}
//                 placeholder="Search order #, customer name, or email..."
//               />
//               <s-button variant="secondary" onClick={handleSearchSubmit} loading={isSearching ? true : undefined}>
//                 Search
//               </s-button>
//               {searchQuery && (
//                 <s-button variant="tertiary" onClick={handleClearSearch} disabled={isSearching ? true : undefined}>
//                   Clear ({searchQuery})
//                 </s-button>
//               )}
//             </s-grid>
// 
//             <s-divider></s-divider>
// 
//             {/* Review Invitation Form */}
//             <s-stack gap="base">
//               <s-select
//                 label="Select Delivered Order"
//                 value={selectedOrderId}
//                 onChange={(e) => setSelectedOrderId(e.target.value)}
//                 disabled={orders.length === 0 ? true : undefined}
//               >
//                 {orders.length === 0 ? (
//                   <s-option value="" disabled>
//                     {searchQuery
//                       ? `No delivered orders matching "${searchQuery}"`
//                       : "No delivered orders found yet"}
//                   </s-option>
//                 ) : (
//                   <>
//                     <s-option value="">Please select an order</s-option>
//                     {orders.map((o) => (
//                       <s-option key={o.id} value={o.id}>
//                         {`${o.orderNumber} â€” ${o.customerName} (${o.customerEmail || "No email"}) â€¢ [${o.fulfillmentStatus}]`}
//                       </s-option>
//                     ))}
//                   </>
//                 )}
//               </s-select>
// 
//               <s-grid gridTemplateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap="small">
//                 <s-text-field
//                   label="Customer Name"
//                   value={customerName}
//                   onInput={(e) => setCustomerName(e.target.value)}
//                   disabled={!currentOrder ? true : undefined}
//                 />
// 
//                 <s-text-field
//                   label="Customer Email"
//                   type="email"
//                   value={customerEmail}
//                   onInput={(e) => setCustomerEmail(e.target.value)}
//                   disabled={!currentOrder ? true : undefined}
//                 />
// 
//                 {currentOrder && currentOrder.items && currentOrder.items.length > 0 ? (
//                   <s-select
//                     label="Purchased Product"
//                     value={selectedProductIndex.toString()}
//                     onChange={(e) => setSelectedProductIndex(Number(e.target.value))}
//                   >
//                     {currentOrder.items.map((item, idx) => (
//                       <s-option key={item.id || idx} value={idx.toString()}>
//                         {item.title}
//                       </s-option>
//                     ))}
//                   </s-select>
//                 ) : (
//                   <s-text-field
//                     label="Purchased Product"
//                     value=""
//                     disabled
//                     placeholder="No product selected"
//                   />
//                 )}
//               </s-grid>
// 
//               <div>
//                 {!isPro ? (
//                   <s-button
//                     variant="primary"
//                     onClick={handleOpenProModal}
//                   >
//                     Upgrade to Pro to Send ðŸ”’
//                   </s-button>
//                 ) : (
//                   <s-button
//                     variant="primary"
//                     loading={isSending ? true : undefined}
//                     disabled={!currentOrder || !currentProduct || !customerEmail.trim() ? true : undefined}
//                     onClick={handleSend}
//                   >
//                     Send Review Invitation
//                   </s-button>
//                 )}
//               </div>
//             </s-stack>
//           </s-stack>
//         </s-section>
// 
//         {/* Section 2: Delivery & Activity Log */}
//         <s-section>
//           <s-stack gap="base">
//             <s-heading size="small">Delivery &amp; Activity Log</s-heading>
// 
//             {requests.length === 0 ? (
//               <s-box padding="large">
//                 <s-stack gap="extra-tight" alignItems="center">
//                   <s-text tone="subdued" weight="semibold">
//                     No invitations sent yet
//                   </s-text>
//                   <s-text tone="subdued" size="small">
//                     Use the form above to send your first customer review invitation.
//                   </s-text>
//                 </s-stack>
//               </s-box>
//             ) : (
//               <s-stack gap="small">
//                 {requests.map((req) => (
//                   <s-box key={req.id} background="subdued" padding="base" borderRadius="base">
//                     <s-stack direction="inline" justifyContent="space-between" alignItems="center">
//                       <s-stack gap="extra-tight">
//                         <s-text weight="semibold">
//                           {req.customerName || req.customerEmail}
//                         </s-text>
//                         <s-text tone="subdued" size="small">
//                           Order: <s-text weight="medium">{req.orderId}</s-text> â€¢ Product:{" "}
//                           <s-text weight="medium">{req.productTitle || req.productId}</s-text> â€¢ Channel:{" "}
//                           {req.channel} â€¢ {new Date(req.createdAt).toLocaleString()}
//                         </s-text>
//                       </s-stack>
// 
//                       <s-badge
//                         tone={
//                           req.status === "SENT"
//                             ? "success"
//                             : req.status === "FAILED"
//                               ? "critical"
//                               : "warning"
//                         }
//                       >
//                         {req.status ? req.status.charAt(0).toUpperCase() + req.status.slice(1).toLowerCase() : ""}
//                       </s-badge>
//                     </s-stack>
//                   </s-box>
//                 ))}
//               </s-stack>
//             )}
//           </s-stack>
//         </s-section>
//       </s-stack>
// 
//       {/* Upgrade Pro Modal */}
//       <s-modal id="upgrade-pro-modal" heading="Unlock Review Requests with Reviora Pro">
//         <s-stack gap="base">
//           <s-banner tone="info">
//             <s-paragraph>
//               <strong>Review Requests</strong> is an exclusive <strong>Reviora Pro</strong> feature at only <strong>$4.99/month</strong>.
//             </s-paragraph>
//           </s-banner>
// 
//           <s-stack gap="tight">
//             <s-text type="strong">Everything included with Pro:</s-text>
//             <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
//               <CheckCircle2 size={16} color="#10b981" />
//               <s-text size="small">Automated &amp; manual review request emails by order</s-text>
//             </div>
//             <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
//               <CheckCircle2 size={16} color="#10b981" />
//               <s-text size="small">All 4 Premium Widgets: Video Reels, UGC Wall, Review Popups &amp; Floating Drawer</s-text>
//             </div>
//             <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
//               <CheckCircle2 size={16} color="#10b981" />
//               <s-text size="small">Customer photo &amp; video uploads with fast CDN hosting</s-text>
//             </div>
//             <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
//               <CheckCircle2 size={16} color="#10b981" />
//               <s-text size="small">Save custom widget styling &amp; live theme editor sync</s-text>
//             </div>
//             <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
//               <CheckCircle2 size={16} color="#10b981" />
//               <s-text size="small">Google Shopping &amp; Rich Snippets (Schema.org JSON-LD)</s-text>
//             </div>
//             <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
//               <CheckCircle2 size={16} color="#10b981" />
//               <s-text size="small">Priority 24/7 Live Chat &amp; Email Support</s-text>
//             </div>
//           </s-stack>
//         </s-stack>
// 
//         <s-button
//           slot="primary-action"
//           variant="primary"
//           onClick={handleNavigateToBilling}
//         >
//           Upgrade to Pro ($4.99/mo) â†—
//         </s-button>
//         <s-button
//           slot="secondary-actions"
//           commandFor="upgrade-pro-modal"
//           command="--hide"
//           onClick={handleCloseProModal}
//         >
//           Maybe Later
//         </s-button>
//       </s-modal>
//     </s-page>
//   );
// }
// 
// 
