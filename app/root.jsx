import { Links, Meta, Outlet, Scripts, ScrollRestoration, isRouteErrorResponse, useRouteError } from "react-router";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import revioraStyles from "./reviora-admin.css?url";
import { ZohoSalesIQ } from "./components/ZohoSalesIQ.jsx";

export const links = () => [
  { rel: "stylesheet", href: polarisStyles },
  { rel: "stylesheet", href: revioraStyles },
];

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
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
