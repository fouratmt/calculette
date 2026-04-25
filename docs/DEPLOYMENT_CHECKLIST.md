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
| Metadata | Implemented | Description, robots, mobile theme color, polished favicon, deferred manifest registration, canonical URL, Open Graph, and Twitter tags are present. Production URLs point to `https://monquota.fr/`. | Recheck values only if the production domain changes. |
| Favicon and app manifest | Implemented | `favicon.png`, Apple touch icon, regular install icons, maskable install icons, manifest screenshots, and `site.webmanifest` are present; the manifest link is registered after first paint. | Verify the production host serves `.webmanifest` as `application/manifest+json` or a compatible JSON type. |
| PWA service worker | Implemented | `service-worker.js` caches the static app shell and is registered only on secure browser origins, so direct `file://` usage still works without service worker assumptions. | After deployment, verify the service worker activates and the installed app opens offline. |
| Social sharing image | Implemented | `social-card.png` is production-hosted and referenced by Open Graph/Twitter metadata; `social-card.svg` remains as the editable source. | None. |
| Search engine access | Implemented | `robots.txt` allows crawling and points to `https://monquota.fr/sitemap.xml`; `sitemap.xml` contains absolute production URLs. | Submit or inspect the sitemap only if search indexing matters. |
| Custom domain | Done | `CNAME` contains `monquota.fr`; DNS is configured and the custom domain is verified in GitHub Pages settings. | None. |
| HTTPS | Done | Enforce HTTPS is enabled in GitHub Pages after domain verification. | Verify behavior in the production smoke test. |
| Production smoke test | Not yet verified | The production site should be checked from the public URL after deployment. | Confirm homepage `200`, unknown routes show `404.html`, and `http://` redirects to `https://`. |
| Social preview rendering | Not yet verified | Metadata points to `https://monquota.fr/social-card.png`. | Check rendering with target social/link preview tools after deployment. |
| 404 page | Implemented | `404.html` is present for GitHub Pages unknown routes. | Covered by the production smoke test. |
| Security headers | Not configurable on GitHub Pages | GitHub Pages does not support repository-defined custom response headers for a plain static Pages site. | Use a proxy such as Cloudflare only if custom CSP/security headers become a hard requirement. |
| Cache policy | GitHub Pages managed | GitHub Pages controls response caching; this repo intentionally avoids long-lived hashed asset assumptions. | After deploy, verify updates appear after a refresh. Move to hashed assets or another host only if cache control becomes a release blocker. |
| Release checks | Implemented locally | `just check` runs syntax validation and Node unit tests. | Run it before each release, then perform the manual smoke tests below on production. |

## 2. GitHub Pages Setup

1. Push the repository to GitHub.
2. Keep the existing repository Pages flow; no additional GitHub Actions workflow is needed for this app.
3. Confirm the root `CNAME` file contains only `monquota.fr`.
4. DNS is configured and the custom domain is verified in GitHub Pages settings.
5. Enforce HTTPS is enabled.
6. Verify that the production page registers `service-worker.js`; service workers require HTTPS, except on localhost.

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
3. Confirm the manifest detects regular icons, maskable icons, screenshots, and the dark teal mobile theme color.
4. Install the app on a mobile browser and verify the browser chrome/status color matches the app palette.
5. Verify the session warning text mentions browser-and-address scoped data.
6. Re-run the smoke test on the real production URL.
7. Check social previews against the production PNG image URL.
