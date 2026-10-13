# Manual test checklist

## Catalog

- [ ] Open `/products` on desktop and mobile.
- [ ] Search by product name.
- [ ] Filter by color, personalization, experience level, price range,
  subcategory, materials and positive/negative description terms.
- [ ] Try an invalid name, color, description expression and duplicate sorting
  keys; confirm that a visible validation message appears.
- [ ] Sort ascending and descending with two different sort keys.
- [ ] Move between pagination pages and confirm that only the current page is
  visible.
- [ ] Open a product modal, close it with the close button, background and
  Escape.
- [ ] Pin a product, temporarily hide a product and hide a product for the
  current tab session.
- [ ] Reload the page and confirm that session-hidden products remain hidden.
- [ ] Reset all filters and temporary states.

## Other pages

- [ ] Open the homepage, static gallery, animated gallery, About, Guides and
  Contact pages.
- [ ] Change the visual theme and reload the page; confirm that the choice is
  preserved.
- [ ] Check the responsive navigation on a narrow viewport.
- [ ] Check the custom responses for invalid product IDs, missing products and
  unknown categories.
- [ ] Add products to the cart, change quantities and open `/checkout`.
- [ ] Submit checkout with invalid customer data and confirm that visible
  validation errors are shown without creating an order.
- [ ] Submit a valid checkout and confirm the order confirmation page, total
  and cart clearing.
- [ ] Submit the same checkout twice and confirm that it does not create a
  second order.
- [ ] Reduce product stock in another session and confirm that checkout
  rejects insufficient stock without leaving a partial order.
- [ ] Create an account with an invalid e-mail or short password and confirm
  that validation errors are displayed.
- [ ] Create an account, refresh the page and confirm that the session remains
  active.
- [ ] Log out, log back in with an incorrect password and confirm that the
  generic authentication error is displayed.
- [ ] While authenticated, place an order and confirm it appears under
  `/my-orders`.
- [ ] Set a test account's database role to `admin` and confirm `/admin` is
  accessible only for that account.
- [ ] From the admin dashboard, update an order status and confirm the new
  status appears after reload.
- [ ] Update a product's price and stock from the dashboard and confirm the
  catalog uses the new values.
- [ ] Confirm a regular authenticated user receives a forbidden response for
  admin routes.
- [ ] Submit each browser form without its CSRF public_token and confirm the server
  rejects the request.
- [ ] Send repeated login attempts from the same customer and confirm a `429`
  response is returned after the configured limit.
- [ ] Inspect production responses and confirm security headers are present,
  including HSTS when HTTPS is enabled.

## Continuous integration

- [ ] Push the branch to GitHub and confirm the `CI` workflow starts.
- [ ] Confirm the workflow completes dependency audit, syntax checks, tests and
  the Sass build.
- [ ] Open a test pull request and confirm the same checks run there.

## Deployment

- [ ] Configure the production database connection only through hosting
  environment variables.
- [ ] Confirm migrations run successfully before the application starts.
- [ ] Confirm the hosting health check reports `{"status":"ok"}`.
- [ ] Confirm production cookies include `Secure` and HSTS is present over
  HTTPS.

## Accessibility and presentation

- [ ] Navigate the catalog controls with the keyboard.
- [ ] Confirm that modal, pagination and result messages are announced or
  labelled correctly.
- [ ] Check images have meaningful alternative text.
- [ ] Check the layout at desktop, tablet and mobile widths.
