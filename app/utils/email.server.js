import { Resend } from "resend";

function getResendClient() {
  const apiKey = process.env.RESEND_MAIL_API || process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("⚠️ [Reviora Email] RESEND_MAIL_API is not set in .env");
    return null;
  }
  return new Resend(apiKey);
}

/**
 * Send a review invitation email via Resend
 */
export async function sendReviewRequestEmail({
  to,
  customerName = "Customer",
  productTitle = "your item",
  productHandle = "",
  shop = "",
  token = "",
}) {
  const resend = getResendClient();
  if (!resend) {
    return {
      success: false,
      error: "Resend API key missing. Please add RESEND_MAIL_API to your .env file.",
    };
  }

  // Use the shop URL or fallback
  const storeUrl = shop ? `https://${shop}` : "";
  const productUrl = productHandle ? `${storeUrl}/products/${productHandle}` : storeUrl;
  const reviewLink = `${productUrl}?reviora_token=${token}#reviora-review-form`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>How was your purchase?</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f6f6f7; margin: 0; padding: 0; color: #202223; }
    .container { max-width: 580px; margin: 30px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #e1e3e5; }
    .header { background: #008060; padding: 24px 32px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 600; letter-spacing: -0.3px; }
    .content { padding: 32px; text-align: center; }
    .greeting { font-size: 16px; margin-bottom: 12px; font-weight: 500; }
    .message { font-size: 15px; color: #5c5f62; line-height: 1.5; margin-bottom: 24px; }
    .product-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px 18px; margin: 20px 0 28px 0; font-weight: 600; font-size: 15px; }
    .stars-wrapper { margin: 24px 0 32px 0; }
    .star-btn { display: inline-block; font-size: 28px; text-decoration: none; margin: 0 4px; color: #f59e0b; transition: transform 0.1s; }
    .cta-btn { display: inline-block; background-color: #008060; color: #ffffff !important; padding: 13px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 15px; margin-top: 10px; }
    .footer { padding: 20px 32px; background: #fafbfb; border-top: 1px solid #f1f2f3; text-align: center; font-size: 12px; color: #8c9196; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>We Value Your Feedback</h1>
    </div>
    <div class="content">
      <div class="greeting">Hi ${customerName},</div>
      <div class="message">
        Thank you for choosing us! We hope you love your recent order. Could you take 30 seconds to share your experience?
      </div>

      <div class="product-box">
        📦 ${productTitle}
      </div>

      <div style="font-size: 13px; font-weight: 600; color: #6d7175; text-transform: uppercase; letter-spacing: 0.5px;">
        Tap a star to rate:
      </div>

      <div class="stars-wrapper">
        <a href="${reviewLink}&rating=1" class="star-btn" title="1 Star">★</a>
        <a href="${reviewLink}&rating=2" class="star-btn" title="2 Stars">★</a>
        <a href="${reviewLink}&rating=3" class="star-btn" title="3 Stars">★</a>
        <a href="${reviewLink}&rating=4" class="star-btn" title="4 Stars">★</a>
        <a href="${reviewLink}&rating=5" class="star-btn" title="5 Stars">★</a>
      </div>

      <div>
        <a href="${reviewLink}" class="cta-btn">Leave a Review</a>
      </div>
    </div>
    <div class="footer">
      Sent with Reviora Product Reviews. If you did not make this purchase, you can safely ignore this email.
    </div>
  </div>
</body>
</html>
  `.trim();

  const textContent = `
Hi ${customerName},

Thank you for choosing us! We hope you love your recent order of ${productTitle}.

Could you take 30 seconds to share your experience?
Review your item here: ${reviewLink}

Thank you,
${shop ? shop.replace('.myshopify.com', '') : 'The Team'}
  `.trim();

  try {
    const senderDomain = process.env.RESEND_FROM_EMAIL || "Reviora <onboarding@resend.dev>";

    const data = await resend.emails.send({
      from: senderDomain,
      to: [to],
      reply_to: process.env.SUPPORT_EMAIL || undefined,
      subject: `How was your ${productTitle}? Leave a review`,
      html: htmlContent,
      text: textContent,
      headers: {
        "X-Entity-Ref-ID": token,
      },
    });

    if (data.error) {
      console.error("❌ [Resend Error]:", data.error);
      return { success: false, error: data.error.message || "Failed to send email" };
    }

    return { success: true, id: data.data?.id };
  } catch (err) {
    console.error("❌ [Resend Exception]:", err);
    return { success: false, error: err.message || "Email dispatch failed" };
  }
}
