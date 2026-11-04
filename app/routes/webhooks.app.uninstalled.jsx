import { authenticate, sessionStorage } from "../shopify.server";
import { notifyAppUninstall } from "../services/slack.server.js";
import { StoreReviews } from "../models/review.model.js";
import { connectDB } from "../db.server.js";

export const action = async ({ request }) => {
  let shop, topic;

  try {
    const authResult = await authenticate.webhook(request);
    shop = authResult.shop;
    topic = authResult.topic;
  } catch (error) {
    if (error instanceof Response && (error.status === 401 || error.status === 400)) {
      throw error;
    }
    console.error("Error authenticating app/uninstalled webhook:", error);
    return new Response(null, { status: 200 });
  }

  console.log(`Received ${topic} webhook for ${shop}`);

  // Notify Slack of uninstall & reset notification flag in DB so future reinstalls notify again
  try {
    await connectDB();
    await StoreReviews.updateOne(
      { shop },
      {
        $set: {
          slackInstallNotifiedAt: null,
          plan: "FREE",
          onboardingCompleted: false,
          onboardingStep: 1,
        },
      }
    );
    notifyAppUninstall({ shop }).catch((e) =>
      console.error("[Slack] Error sending uninstall alert:", e)
    );
  } catch (err) {
    console.error("Error updating store state on uninstall:", err);
  }

  // Webhook requests can trigger multiple times and after an app has already been uninstalled.
  try {
    if (sessionStorage) {
      const sessions = await sessionStorage.findSessionsByShop(shop);
      if (sessions && sessions.length > 0) {
        const sessionIds = sessions.map((s) => s.id);
        await sessionStorage.deleteSessions(sessionIds);
      }
    }
  } catch (error) {
    console.error(`Error deleting sessions for uninstalled shop ${shop}:`, error);
  }

  return new Response(null, { status: 200 });
};
