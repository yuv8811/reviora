export const GET_RECENT_ORDERS_QUERY = `#graphql
  query getRecentOrders($first: Int = 50, $query: String) {
    orders(first: $first, query: $query, sortKey: CREATED_AT, reverse: true) {
      nodes {
        id
        name
        createdAt
        displayFulfillmentStatus
        displayFinancialStatus
        closed
        customer {
          displayName
          firstName
          lastName
          email
        }
        email
        lineItems(first: 10) {
          nodes {
            id
            title
            product {
              id
              title
              handle
            }
          }
        }
      }
    }
  }
`;
