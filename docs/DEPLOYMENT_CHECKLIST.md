# Deployment Checklist

This app is static and already runnable from `index.html`. The target hosting setup is GitHub Pages with the custom domain `monquota.fr`. The table below tracks public-launch readiness against the current repository state.

## 1. Launch Readiness Status

| Area | Status | Current repo state | What remains |
| --- | --- | --- | --- |
| Static deployable app | Implemented | `index.html`, `confidentialite.html`, `404.html`, `src/`, and root assets can be served directly. | Keep the app build-free. |
| GitHub Pages deployment flow | Already configured outside this pass | The app remains plain static files and does not need any additional GitHub Actions work. | Keep using the existing Pages flow already configured for the repository. |
| GitHub Pages static serving compatibility | Implemented | `.nojekyll` is present so GitHub Pages serves the static tree without Jekyll processing. | None. |
| Direct local execution | Implemented | The app uses plain deferred scripts and works from `index.html` without a build step. | Keep this behavior when future changes are made. |
| Local-only data model | Implemented | Planning data stays in `localStorage`; JSON export/import is available for migration between origins. | Tell users to export/import before moving from preview or local URLs to production. |
| Metadata | Implemented | Description, robots, theme color, favicon, manifest, canonical URL, Open Graph, and Twitter tags are present. Production URLs point to `https://monquota.fr/`. | Recheck values only if the production domain changes. |
| Favicon and app manifest | Implemented | `favicon.png` and `site.webmanifest` are present and linked from `index.html`. | Verify the production host serves `.webmanifest` as `application/manifest+json` or a compatible JSON type. |
| Social sharing image | Implemented | `social-card.png` is production-hosted and referenced by Open Graph/Twitter metadata; `social-card.svg` remains as the editable source. | Test social previews after deployment. |
| Search engine access | Implemented | `robots.txt` allows crawling and points to `https://monquota.fr/sitemap.xml`; `sitemap.xml` contains absolute production URLs. | Submit or inspect the sitemap only if search indexing matters. |
| Custom domain | Implemented in repo | `CNAME` contains `monquota.fr`. | Configure or verify DNS for GitHub Pages in the domain provider and GitHub Pages settings. |
| HTTPS | GitHub Pages setting | HTTPS cannot be implemented as an app file. GitHub Pages provides HTTPS for Pages sites and custom domains after DNS is valid. | Enable Enforce HTTPS in GitHub Pages settings after the custom domain is configured. |
| HTTP-to-HTTPS redirect | GitHub Pages setting | This is handled by GitHub Pages when Enforce HTTPS is enabled. | Verify `http://` redirects to `https://` after launch. |
| 404 page | Implemented | `404.html` is present for GitHub Pages unknown routes. | Verify an unknown production URL returns the custom 404 page. |
| Security headers | Not configurable on GitHub Pages | GitHub Pages does not support repository-defined custom response headers for a plain static Pages site. | Use a proxy such as Cloudflare only if custom CSP/security headers become a hard requirement. |
| Cache policy | GitHub Pages managed | GitHub Pages controls response caching; this repo intentionally avoids long-lived hashed asset assumptions. | After deploy, verify updates appear after a refresh. Move to hashed assets or another host only if cache control becomes a release blocker. |
| Release checks | Implemented locally | `just check` runs syntax validation and Node unit tests. | Run it before each release, then perform the manual smoke tests below on production. |

## 2. GitHub Pages Setup

1. Push the repository to GitHub.
2. Keep the existing repository Pages flow; no additional GitHub Actions workflow is needed for this app.
3. Confirm the root `CNAME` file contains only `monquota.fr`.
4. Configure DNS for GitHub Pages:
   - for an apex domain, use GitHub Pages `A` and `AAAA` records
   - for a `www` subdomain, use a `CNAME` record pointing to `<owner>.github.io`
5. After GitHub verifies the domain, enable Enforce HTTPS.

GitHub Pages limitations:

- Repository-defined custom response headers are not supported for plain GitHub Pages static hosting.
- Repository-defined cache-control rules are not supported for plain GitHub Pages static hosting.
- If strict custom headers or cache rules become mandatory, put the site behind a proxy/CDN that can set them.

Preferred response headers if a proxy/CDN is added later:

```text
Content-Security-Policy: default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), camera=(), microphone=(), payment=(), usb=()
Cross-Origin-Opener-Policy: same-origin
```

## 3. Cache Strategy

- GitHub Pages manages cache headers for static files.
- Because assets are not filename-hashed, avoid relying on long immutable caching in any future proxy/CDN configuration.
- If a proxy/CDN is added, use short cache lifetimes or purge assets on each release until asset versioning is introduced.

Good proxy/CDN default before asset versioning:

```text
Cache-Control: no-cache
```

or a short TTL such as:

```text
Cache-Control: public, max-age=300
```

## 4. Data Migration Warning

`localStorage` is scoped to the exact browser origin.

That means these are all separate storage buckets:

- `file:///.../index.html`
- `http://127.0.0.1:4173`
- the temporary GitHub Pages URL
- the final custom domain

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
7. Validate that the production pages return `200`, unknown routes show `404.html`, and HTTP redirects to HTTPS.
8. Confirm the existing GitHub Pages flow completed successfully.

## 6. Post-Deploy Checks

1. Open the production homepage and confirm the favicon and manifest are detected.
2. Confirm the browser console is clean.
3. Verify the session warning text mentions browser-and-address scoped data.
4. Re-run the smoke test on the real production URL.
5. Check social previews against the production PNG image URL.
6. Confirm the custom domain is shown as verified in GitHub Pages settings.
