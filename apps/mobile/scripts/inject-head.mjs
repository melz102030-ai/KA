/**
 * Adds the icon / manifest / link-preview tags to the exported index.html.
 *
 * Expo Router's `app/+html.tsx` hook only runs for `web.output: "static"`.
 * This app ships as `"single"` (a real SPA — both Vercel and Firebase Hosting
 * rewrite every path to index.html, so per-route HTML files would never be
 * served anyway), and Expo emits a bare shell for that mode. So the head is
 * patched in right after `expo export`.
 *
 * Social crawlers don't run JavaScript and ignore relative image paths, so
 * og:image must be absolute. Point EXPO_PUBLIC_SITE_URL at the domain you
 * deploy to; the fallback is the Firebase Hosting domain for the project id
 * in .firebaserc.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const FILE = new URL("../dist/index.html", import.meta.url);
const MARKER = "<!-- akbadna:head -->";

const SITE = (process.env.EXPO_PUBLIC_SITE_URL || "https://kasa-dcabd.web.app").replace(/\/+$/, "");
const TITLE = "أكبادنا — منصة التعليم الذكية";
const DESCRIPTION =
  "متابعة الأبناء في المدرسة وأثناء التنقّل عبر ساعة ذكية: حضور وغياب، تتبّع لحظي، ورحلات مدرسية بسائقين موثّقين.";

const HEAD = `${MARKER}
    <meta name="description" content="${DESCRIPTION}" />
    <meta name="theme-color" content="#0E7A5F" />

    <link rel="icon" href="/icon-192.png" type="image/png" sizes="192x192" />
    <link rel="icon" href="/icon-512.png" type="image/png" sizes="512x512" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />

    <link rel="manifest" href="/manifest.json" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="أكبادنا" />

    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="أكبادنا" />
    <meta property="og:locale" content="ar_SA" />
    <meta property="og:title" content="${TITLE}" />
    <meta property="og:description" content="${DESCRIPTION}" />
    <meta property="og:url" content="${SITE}/" />
    <meta property="og:image" content="${SITE}/og.png" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="شعار أكبادنا" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${TITLE}" />
    <meta name="twitter:description" content="${DESCRIPTION}" />
    <meta name="twitter:image" content="${SITE}/og.png" />
  `;

if (!existsSync(FILE)) {
  console.error("inject-head: dist/index.html is missing — run `expo export -p web` first.");
  process.exit(1);
}

let html = readFileSync(FILE, "utf8");

if (html.includes(MARKER)) {
  console.log("inject-head: already patched, nothing to do.");
  process.exit(0);
}
if (!html.includes("</head>")) {
  console.error("inject-head: no </head> in the exported shell — Expo's template changed.");
  process.exit(1);
}

// Arabic-first document, and a title that reads well in a shared link.
html = html.replace('<html lang="en">', '<html lang="ar" dir="rtl">');
html = html.replace(/<title>[^<]*<\/title>/, `<title>${TITLE}</title>`);
html = html.replace("</head>", `${HEAD}</head>`);

writeFileSync(FILE, html);
console.log(`inject-head: patched dist/index.html (site: ${SITE})`);
