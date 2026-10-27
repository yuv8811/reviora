import { authenticate, sessionStorage } from "../shopify.server";

export const action = async ({ request }) => {
  const { shop, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

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

  return new Response();
};
