# Deployment Checklist

This app is static and already runnable from `index.html`, but going live still needs a few explicit release steps.

## 1. Before The First Public Release

1. Complete the editor and host information in `confidentialite.html`.
2. Decide the final production URL.
3. If you want search indexing, create a `sitemap.xml` with absolute production URLs once the domain is known.
4. If your social previews must be perfect across every platform, replace the SVG social card with a hosted PNG version and update the matching meta tags.

## 2. Hosting Requirements

- Serve over HTTPS only.
- Keep the site static: `index.html`, `confidentialite.html`, `src/`, and the root assets can all be served directly.
- Make sure the host sends the correct MIME type for `.webmanifest` and `.svg`.

Recommended response headers:

```text
Content-Security-Policy: default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), camera=(), microphone=(), payment=(), usb=()
Cross-Origin-Opener-Policy: same-origin
```

Notes:

- The current app does not require any third-party script, API, or font host.
- If you later add inline scripts or remote assets, update the CSP deliberately instead of weakening it broadly.

## 3. Cache Strategy

- `index.html`, `confidentialite.html`, and `site.webmanifest` should use a short cache lifetime or `no-cache`.
- `src/*.js`, `src/*.css`, and root SVG assets should either be cache-purged on release or served with a short TTL until asset versioning is introduced.
- Without hashed filenames, do not use long immutable caching for the current assets.

## 4. Data Migration Warning

`localStorage` is scoped to the exact browser origin.

That means these are all separate storage buckets:

- `file:///.../index.html`
- `http://127.0.0.1:4173`
- a preview deployment URL
- the final production domain

Before switching users from one origin to another, tell them to:

1. export a JSON backup from the old origin
2. open the new origin
3. import the JSON backup

## 5. Release QA

Run locally before release:

```sh
just check
```

Manual smoke tests:

1. Load the app in a fresh browser profile.
2. Change year and yearly target.
3. Edit a single day and a multi-day range.
4. Verify weekend holidays stay editable as holidays.
5. Export a JSON backup, clear the session, then import it again.
6. Test the app on desktop and on a real mobile browser for touch selection.
7. Open `confidentialite.html` and verify the public links and metadata load correctly.

## 6. Post-Deploy Checks

1. Open the production homepage and confirm the favicon and manifest are detected.
2. Confirm the browser console is clean.
3. Verify the session warning text mentions browser-and-address scoped data.
4. Re-run the smoke test on the real production URL.
