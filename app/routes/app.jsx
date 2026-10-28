import { Outlet, useLoaderData, useRouteError, isRouteErrorResponse, useNavigation } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { authenticate } from "../shopify.server";
import { PageSkeleton } from "../components/PageSkeleton.jsx";
import process from "process";

export const loader = async ({ request }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  const url = new URL(request.url);
  if (url.pathname.startsWith("/app/api/")) {
    return null;
  }

  const { session } = await authenticate.admin(request);

  // eslint-disable-next-line no-undef
  return {
    apiKey: process.env.SHOPIFY_API_KEY,
    shop: session.shop,
  };
};

export const meta = ({ data }) => {
  const tags = [];
  if (data?.apiKey) {
    tags.push({ name: "shopify-api-key", content: data.apiKey });
  }
  if (data?.shop) {
    tags.push({ name: "shopify-shop", content: data.shop });
  }
  return tags;
};

export default function App() {
  const { apiKey } = useLoaderData();
  const navigation = useNavigation();

  // Immediate skeleton display whenever page is loading
  const isLoading = navigation.state === "loading";

  return (
    <AppProvider embedded apiKey={apiKey}>
      <s-app-nav>
        <s-link href="/app">Dashboard</s-link>
        <s-link href="/app/reviews">Moderation Inbox</s-link>
        {/* <s-link href="/app/requests">Requests</s-link> */}
        <s-link href="/app/import">Import &amp; Export</s-link>
        <s-link href="/app/widgets">Widgets</s-link>
        <s-link href="/app/billing">Billing</s-link>
      </s-app-nav>
      {isLoading ? (
        <PageSkeleton />
      ) : (
        <div>
          <Outlet />
        </div>
      )}
    </AppProvider>
  );
}

// Shopify needs React Router to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  const error = useRouteError();

  // Fix Shopify App React Router minification bug where boundary.error checks error.constructor.name
  if (isRouteErrorResponse(error)) {
    return <div dangerouslySetInnerHTML={{ __html: error.data || "" }} />;
  }

  try {
    return boundary.error(error);
  } catch {
    return (
      <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
        <h2>Application Error</h2>
        <p>{error?.message || "An unexpected error occurred."}</p>
      </div>
    );
  }
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
