# Privacy Policy for Reviora

**Last Updated:** October 27, 2026  
**Effective Date:** October 27, 2026  
**Application Name:** Reviora (Product Reviews, Star Ratings & UGC)

---

## 1. Introduction

Reviora ("we", "us", or "our") provides an e-commerce customer review, star rating, and user-generated content (UGC) application designed for merchants operating on the Shopify platform. This Privacy Policy describes how we collect, use, process, disclose, and protect personal data when merchants install and use Reviora, and when consumers interact with our storefront review blocks, forms, or automated review requests.

We are dedicated to safeguarding personal data in strict compliance with:
- The **Shopify Partner Program Agreement** and **Shopify API License and Terms of Use**
- The **General Data Protection Regulation (GDPR)** (EU Regulation 2016/679)
- The **California Consumer Privacy Act (CCPA / CPRA)**
- Applicable international data protection and consumer privacy regulations

---

## 2. Information We Collect

### A. Merchant Information
When a merchant installs Reviora from the Shopify App Store, we automatically receive and store:
- **Shop Identification:** Store myshopify domain (e.g., `store-name.myshopify.com`), store name, primary email address, store owner name, country, currency, and timezone.
- **Access Tokens:** Scoped OAuth access tokens required to communicate with the Shopify Admin GraphQL API.
- **Merchant Configuration:** Widget display settings, custom primary star colors, email template text, auto-moderation rules, and subscription plan tier (`FREE` or `PRO`).

### B. Customer and Reviewer Information
When shoppers submit reviews or questions, or interact with Reviora widgets on a merchant's store, we collect:
- **Reviewer Identifiers:** Reviewer name or display nickname, customer email address.
- **Review Content:** Star rating (1 to 5 stars), review headline, written review text, answers to custom questions, and submitted customer photos or video clips.
- **Technical Metadata:** IP address, timestamp, and browser user-agent at the time of submission (strictly utilized for rate limiting, spam prevention, and anti-fraud detection).
- **Verification Status:** Order matching indicators used to confirm whether the customer is a "Verified Buyer".

### C. Order Information (Purchase Verification & Review Requests)
To schedule automated review request emails after delivery and authenticate genuine buyers:
- **Order Details:** Shopify Order ID, line item product IDs, product handles, fulfillment status, and delivery timestamps.
- **Financial Exclusions:** Reviora **never** collects, processes, transmits, or stores credit card numbers, CVVs, bank details, or payment credentials. All app billing and storefront checkout payments are executed directly by Shopify.

---

## 3. How We Use Your Information

We process personal data strictly to deliver and maintain our core features, including:
1. **Storefront Widget Display:** Rendering customer review lists, star badges, testimonial carousels, verified badges, and UGC photo walls via native Shopify Online Store 2.0 Theme App Extensions.
2. **SEO Rich Snippets:** Synchronizing aggregated ratings and total review counts with Shopify Product Metafields for Google organic search rich snippets.
3. **Purchase Verification:** Cross-referencing review submissions with merchant order records to prevent fake reviews and display verified badges.
4. **Automated Review Request Emails:** Sending scheduled transactional email invitations to verified buyers post-fulfillment with direct review submission links.
5. **Merchant Review Moderation:** Providing an admin moderation inbox allowing merchants to approve, reject, archive, and reply to customer feedback.
6. **Platform Invoicing:** Managing recurring app charges through Shopify's Billing API.

---

## 4. Data Sharing & Subprocessors

Reviora **does not sell, rent, trade, or monetize** personal data to third parties, advertising brokers, or data aggregators. Data is shared exclusively with trusted technical infrastructure providers bound by rigorous Data Processing Agreements (DPAs):

| Subprocessor | Purpose | Location |
| :--- | :--- | :--- |
| **Render** | Cloud server hosting & application execution | United States |
| **MongoDB Atlas** | Encrypted primary database and review records | United States / AWS |
| **Cloudinary / AWS S3** | Optimized image and video CDN delivery for review media | Global CDN |
| **Resend / SendGrid** | Transactional email delivery for automated review requests | United States |
| **Shopify Inc.** | Platform APIs, OAuth authentication, App Bridge, and billing | Canada / Global |

---

## 5. Mandatory Shopify Privacy Webhooks (GDPR & CCPA Compliance)

Reviora provides native endpoints and automated listeners for all three mandatory Shopify compliance webhooks:

### 1. Customers Data Request (`customers/data_request`)
When a customer requests a copy of their personal data from a merchant, Shopify notifies Reviora. We extract all reviews, ratings, questions, and media uploaded by that customer email and package it for the merchant to deliver.

### 2. Customers Redact (`customers/redact`)
When a consumer exercises their Right to Erasure, Shopify issues this redaction webhook. We permanently purge or anonymize the customer's personal data (email, name, reviewer IP) and uploaded media within thirty (30) days.

### 3. Shop Redact (`shop/redact`)
Forty-eight (48) hours after a merchant uninstalls Reviora, Shopify sends a store redaction webhook. We permanently delete the store's settings, access tokens, customer records, and review databases from our active infrastructure.

---

## 6. Data Security & Storage Standards

- **Encryption in Transit:** All network traffic between merchants, shoppers, Shopify servers, and our API endpoints is secured using TLS 1.3 / HTTPS.
- **Encryption at Rest:** All databases, backups, and media files are encrypted at rest using AES-256 encryption.
- **Zero Theme Code Clutter:** All storefront widgets operate as native Shopify Online Store 2.0 Theme App Extensions. No Liquid template files are injected, edited, or modified in the merchant's theme.
- **Access Control:** Production access is restricted to verified developers under Multi-Factor Authentication (MFA) and least-privilege principles.

---

## 7. Data Retention

- We retain review submissions and merchant configuration for as long as the merchant maintains an active installation of Reviora.
- When an app uninstallation occurs, store and customer records are queued for deletion and permanently removed upon receiving the `shop/redact` webhook.
- Backups are maintained on rolling 30-day automated cycles and permanently overwritten.

---

## 8. Consumer Rights (GDPR & CCPA)

Depending on their residency, merchants and store shoppers have the right to:
- **Access:** Request details regarding personal information held by Reviora.
- **Correction:** Request updates or rectifications to inaccurate review submissions.
- **Erasure:** Request immediate deletion of their reviews, personal data, and photos.
- **Opt-Out:** Unsubscribe from automated review request emails via the one-click unsubscribe link provided in every email.

---

## 9. Contact Us

If you have questions, feedback, or data privacy requests concerning this policy, please reach out to our team:

- **Data Privacy Inquiries:** `privacy@reviora.com`
- **Merchant Support:** `support@reviora.com`
- **Application URL:** `https://reviora-ef66.onrender.com`
