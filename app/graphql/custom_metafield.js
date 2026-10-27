export const CREATE_CUSTOM_METAFIELD = `#graphql
mutation CreateProductMetafieldDefinitions {
  reviews: metafieldDefinitionCreate(definition: {
    name: "Product Reviews"
    namespace: "reviora"
    key: "reviews"
    description: "The latest 10 published reviews (public fields only)"
    type: "json"
    ownerType: PRODUCT
    access: {
      storefront: PUBLIC_READ
    }
  }) {
    createdDefinition {
      id
      name
      namespace
      key
    }
    userErrors {
      field
      message
      code
    }
  }

  rating: metafieldDefinitionCreate(definition: {
    name: "Average Rating"
    namespace: "reviora"
    key: "rating"
    description: "Average rating"
    type: "rating"
    ownerType: PRODUCT
    access: {
      storefront: PUBLIC_READ
    }
  }) {
    createdDefinition {
      id
      name
      namespace
      key
    }
    userErrors {
      field
      message
      code
    }
  }

  ratingCount: metafieldDefinitionCreate(definition: {
    name: "Rating Count"
    namespace: "reviora"
    key: "rating_count"
    description: "Total published reviews"
    type: "number_integer"
    ownerType: PRODUCT
    access: {
      storefront: PUBLIC_READ
    }
  }) {
    createdDefinition {
      id
      name
      namespace
      key
    }
    userErrors {
      field
      message
      code
    }
  }

  distribution: metafieldDefinitionCreate(definition: {
    name: "Rating Distribution"
    namespace: "reviora"
    key: "distribution"
    description: "Count per star level"
    type: "json"
    ownerType: PRODUCT
    access: {
      storefront: PUBLIC_READ
    }
  }) {
    createdDefinition {
      id
      name
      namespace
      key
    }
    userErrors {
      field
      message
      code
    }
  }
}
`;

export const SET_PRODUCT_METAFIELDS_MUTATION = `#graphql
mutation SetProductReviewMetafields($metafields: [MetafieldsSetInput!]!) {
  metafieldsSet(metafields: $metafields) {
    metafields {
      id
      key
      namespace
      value
    }
    userErrors {
      field
      message
      code
    }
  }
}
`;

export const GET_PRODUCT_ID_BY_HANDLE_QUERY = `#graphql
query GetProductByIdentifier($handle: String!) {
  productByIdentifier(identifier: { handle: $handle }) {
    id
  }
}
`;

export default CREATE_CUSTOM_METAFIELD;