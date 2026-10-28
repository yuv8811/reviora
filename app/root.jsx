import { Links, Meta, Outlet, Scripts, ScrollRestoration, isRouteErrorResponse, useRouteError, useLoaderData } from "react-router";
import revioraStyles from "./reviora-admin.css?url";
import { ZohoSalesIQ } from "./components/ZohoSalesIQ.jsx";
import process from "process";

export const links = () => [
  { rel: "stylesheet", href: revioraStyles },
];

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  return {
    apiKey: process.env.SHOPIFY_API_KEY,
    shop: url.searchParams.get("shop") || "",
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
  const data = useLoaderData();
  const apiKey = data?.apiKey;
  const shop = data?.shop;

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        {apiKey && <meta name="shopify-api-key" content={apiKey} />}
        {shop && <meta name="shopify-shop" content={shop} />}
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <ZohoSalesIQ />
      </body>
    </html>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return (
      <html lang="en">
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <Meta />
          <Links />
        </head>
        <body>
          <div dangerouslySetInnerHTML={{ __html: error.data || "" }} />
          <Scripts />
        </body>
      </html>
    );
  }

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>Application Error</title>
        <Meta />
        <Links />
      </head>
      <body>
        <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
          <h1>Application Error</h1>
          <p>{error?.message || "An unexpected error occurred."}</p>
        </div>
        <Scripts />
      </body>
    </html>
  );
}
