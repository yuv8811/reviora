import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { useState } from "react";
import { Form, useActionData, useLoaderData } from "react-router";
import { login } from "../../shopify.server";
import { loginErrorMessage } from "./error.server";

export const loader = async ({ request }) => {
  const errors = loginErrorMessage(await login(request));

  return { errors };
};

export const action = async ({ request }) => {
  const errors = loginErrorMessage(await login(request));

  return {
    errors,
  };
};

export default function Auth() {
  const loaderData = useLoaderData();
  const actionData = useActionData();
  const [shop, setShop] = useState("");
  const { errors } = actionData || loaderData;

  return (
    <AppProvider embedded={false}>
      <div style={{ maxWidth: "480px", margin: "60px auto", padding: "0 16px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <Form method="post">
          <s-section heading="Log in to Reviora">
            <p style={{ color: "#616161", fontSize: "14px", lineHeight: "1.5", margin: "0 0 16px 0" }}>
              Reviora is a native embedded Shopify app. No separate external account or password is required.
              Enter your Shopify store domain below to authenticate via your Shopify Admin session.
            </p>
            <s-text-field
              name="shop"
              label="Shopify store domain"
              details="e.g. your-store.myshopify.com"
              value={shop}
              onChange={(e) => setShop(e.currentTarget.value)}
              autocomplete="on"
              error={errors.shop}
            ></s-text-field>
            <div style={{ marginTop: "16px" }}>
              <s-button type="submit">Log in with Shopify</s-button>
            </div>
          </s-section>
        </Form>
      </div>
    </AppProvider>
  );
}
