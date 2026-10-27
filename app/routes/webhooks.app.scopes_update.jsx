import { authenticate, sessionStorage } from "../shopify.server";

export const action = async ({ request }) => {
  const { payload, session, topic, shop } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);
  const current = payload.current;

  if (session && sessionStorage) {
    try {
      session.scope = current.toString();
      await sessionStorage.storeSession(session);
    } catch (error) {
      console.error(`Error updating session scope for ${shop}:`, error);
    }
  }

  return new Response();
};
