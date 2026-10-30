Test this Shopify app's frontend end to end, using the browser. Discover the
app's features from the codebase. Do not ask me for a feature list.

STEP 0 - SETUP
1. Read shopify.app.toml, the routes in /app, and /extensions. List every
   page, form, action, and storefront block the app has.
2. If the dev server isn't running, start it with `shopify app dev` and open
   the app in the development store's admin. If login or store selection is
   needed, tell me and wait.
3. Present the test plan (pages and flows you will cover) before starting.

PHASE 1 - FUNCTIONAL TESTING
For every page and feature:
- Click every button, link, tab, toggle, dropdown, and modal.
- Submit every form with valid data, empty data, invalid data, and very
  long text. Check validation messages and success/error toasts.
- Test full flows: onboarding, create, edit, delete, bulk actions, search,
  filter, sort, pagination, import/export, settings save, and billing/plan
  pages (do not complete a real charge).
- Test states: loading, empty (new store), error (simulate a failed
  request if possible), and large data sets.
- Check that data persists after a page refresh and after navigating away.
- Watch the browser console and network tab on every page. Log JS errors,
  failed requests, 4xx/5xx responses, and slow calls.

PHASE 2 - LAYOUT AND VISUAL TESTING
Check each page at 1440px, 1024px, 768px, and 375px widths:
- Overflow, clipped text, overlapping elements, broken alignment
- Consistent spacing, fonts, colors, and Polaris component usage
- Tables and long content scroll or wrap correctly on small screens
- Modals and dropdowns stay inside the viewport
- Dark/long text, RTL text, and long translations don't break the layout
Take screenshots of every issue.

PHASE 3 - STOREFRONT (if the app has theme extensions or app embeds)
- Enable the block/embed in the theme editor and view the storefront on
  desktop and mobile widths.
- Check it with Dawn and one other theme if available.
- Check layout shift, load impact, and console errors on the storefront.
- Confirm it disappears cleanly when disabled.

PHASE 4 - QUALITY CHECKS
- Keyboard navigation, focus order, visible focus states
- Alt text, labels, and contrast on key screens
- Page load time on each admin page

OUTPUT
A report with: what was tested, what passed, and every bug found. For each
bug include the page, steps to reproduce, expected vs actual result, a
screenshot, and severity (Critical / Major / Minor).

Do NOT change any code yet. Stop after the report and wait for my approval.
After approval, fix Critical first, re-test each fix in the browser, and
confirm nothing else broke.