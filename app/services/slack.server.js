import { StoreReviews } from "../models/review.model.js";
import { connectDB } from "../db.server.js";

/**
 * Send a notification payload to Slack.
 * Supports BOTH:
 * 1. Slack Bot Token (SLACK_BOT_TOKEN + SLACK_CHANNEL_ID) using chat.postMessage
 * 2. Slack Incoming Webhook URL (SLACK_WEBHOOK_URL)
 *
 * @param {object|string} payload - Slack Block Kit JSON object or plain text string
 * @returns {Promise<boolean>}
 */
export async function sendSlackNotification(payload) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  const botToken = process.env.SLACK_BOT_TOKEN;
  const channelId = process.env.SLACK_CHANNEL_ID;

  if (!webhookUrl && (!botToken || !channelId)) {
    console.log(
      "[Slack] Neither SLACK_WEBHOOK_URL nor (SLACK_BOT_TOKEN + SLACK_CHANNEL_ID) configured. Skipping notification."
    );
    return false;
  }

  // Method 1: Slack Bot Token via chat.postMessage
  if (botToken && channelId) {
    try {
      const body =
        typeof payload === "string"
          ? { channel: channelId, text: payload }
          : { channel: channelId, ...payload };

      const response = await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Authorization: `Bearer ${botToken}`,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!data.ok) {
        console.error(`[Slack] chat.postMessage failed: ${data.error}`);
        // If bot is not in private channel, provide a helpful message
        if (data.error === "channel_not_found" || data.error === "not_in_channel") {
          console.warn(
            `[Slack] Please make sure to invite the bot to the private channel (${channelId}) by typing: /invite @reviora`
          );
        }
        return false;
      }

      console.log(`[Slack] Successfully posted notification to Slack channel: ${channelId}`);
      return true;
    } catch (error) {
      console.error("[Slack] Error posting to chat.postMessage:", error);
    }
  }

  // Method 2: Incoming Webhook URL
  if (webhookUrl) {
    try {
      const body = typeof payload === "string" ? { text: payload } : payload;
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[Slack] Failed to deliver webhook (${response.status}):`, errText);
        return false;
      }

      console.log("[Slack] Successfully posted notification to Slack via Webhook.");
      return true;
    } catch (error) {
      console.error("[Slack] Network error posting to Slack Webhook:", error);
      return false;
    }
  }

  return false;
}

/**
 * Handle new app install alert.
 * Fetches store details via Shopify Admin GraphQL, creates a rich Block Kit notification,
 * and sets `slackInstallNotifiedAt` in MongoDB to avoid repeat alerts.
 *
 * @param {object} params
 * @param {string} params.shop - myshopify domain (e.g. store.myshopify.com)
 * @param {object} [params.admin] - Shopify admin GraphQL client (if available)
 */
export async function notifyAppInstall({ shop, admin, force = false }) {
  if (!shop) return;

  try {
    await connectDB();
    if (!force) {
      const existing = await StoreReviews.findOne({ shop }).select("slackInstallNotifiedAt").lean();
      if (existing && existing.slackInstallNotifiedAt) {
        // Already notified for this installation
        return;
      }
    }

    let shopDetails = {
      name: shop.replace(".myshopify.com", ""),
      email: "Not provided",
      domain: shop,
      country: "Not specified",
      plan: "basic",
    };

    if (admin) {
      try {
        const query = `#graphql
          query getShopDetailsForSlack {
            shop {
              name
              email
              contactEmail
              myshopifyDomain
              plan {
                displayName
                partnerDevelopment
              }
              billingAddress {
                country
                city
              }
            }
          }
        `;
        const res = await admin.graphql(query);
        const data = await res.json();
        const s = data?.data?.shop;
        if (s) {
          const rawPlan = s.plan?.displayName?.toLowerCase() || "basic";
          const planStr = s.plan?.partnerDevelopment ? `${rawPlan} (dev store)` : rawPlan;
          const countryStr = s.billingAddress?.country
            ? `${s.billingAddress.city ? s.billingAddress.city + ", " : ""}${s.billingAddress.country}`
            : "Not specified";

          shopDetails = {
            name: s.name || shopDetails.name,
            email: s.email || s.contactEmail || "Not provided",
            domain: s.myshopifyDomain || shop,
            country: countryStr,
            plan: planStr,
          };
        }
      } catch (e) {
        console.warn("[Slack] Could not query shop info via GraphQL:", e.message);
      }
    }

    const nowFormatted = new Date().toLocaleString("en-US");

    // Formatted exactly like the requested notification layout
    const slackMessage = {
      text: `🎉 ${shopDetails.name} just installed reviora`,
      attachments: [
        {
          color: "#008060",
          fields: [
            {
              title: "Shop Name",
              value: shopDetails.name,
              short: false,
            },
            {
              title: "Shop Domain",
              value: `<https://${shop}|${shop}>`,
              short: false,
            },
            {
              title: "Owner Email",
              value:
                shopDetails.email && shopDetails.email !== "Not provided"
                  ? `<mailto:${shopDetails.email}|${shopDetails.email}>`
                  : shopDetails.email,
              short: false,
            },
            {
              title: "Country",
              value: shopDetails.country,
              short: false,
            },
            {
              title: "Shopify Plan",
              value: shopDetails.plan,
              short: false,
            },
            {
              title: "Installed At",
              value: nowFormatted,
              short: false,
            },
          ],
        },
      ],
    };

    const sent = await sendSlackNotification(slackMessage);

    // Save timestamp in DB to avoid sending duplicates on every page refresh or session renewal
    await StoreReviews.findOneAndUpdate(
      { shop },
      {
        $setOnInsert: { shop },
        $set: { slackInstallNotifiedAt: new Date() },
      },
      { upsert: true, new: true }
    );

    return sent;
  } catch (err) {
    console.error("[Slack] Error in notifyAppInstall:", err);
  }
}

/**
 * Handle app uninstall alert (optional notification when a store uninstalls).
 *
 * @param {object} params
 * @param {string} params.shop - myshopify domain
 */
export async function notifyAppUninstall({ shop }) {
  if (!shop) return;

  try {
    const cleanShop = shop.replace(".myshopify.com", "");
    const nowFormatted = new Date().toLocaleString("en-US");

    await sendSlackNotification({
      text: `⚠️ ${cleanShop} just uninstalled reviora`,
      attachments: [
        {
          color: "#D82C0D",
          fields: [
            {
              title: "Shop Name",
              value: cleanShop,
              short: false,
            },
            {
              title: "Shop Domain",
              value: `<https://${shop}|${shop}>`,
              short: false,
            },
            {
              title: "Uninstalled At",
              value: nowFormatted,
              short: false,
            },
          ],
        },
      ],
    });
  } catch (err) {
    console.error("[Slack] Error in notifyAppUninstall:", err);
  }
}
