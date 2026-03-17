/**
 * Post-build cleanup script for single-file HTML bundle.
 * Removes dev-only and analytics script tags that should not appear
 * in the self-contained production file.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const htmlPath = resolve(__dirname, "../dist/index.html");

let html = readFileSync(htmlPath, "utf-8");
const originalSize = html.length;

// Remove Manus debug collector script tag
html = html.replace(/<script\s+src="\/__manus__\/debug-collector\.js"[^>]*><\/script>/g, "");
html = html.replace(/<script\s+defer\s+src="\/__manus__\/debug-collector\.js"[^>]*><\/script>/g, "");

// Remove analytics script tag (any umami/analytics external script)
html = html.replace(/<script[^>]+src="https:\/\/manus-analytics[^"]*"[^>]*><\/script>/g, "");
html = html.replace(/<script[^>]+src="https:\/\/manus-analytics[^"]*"[^>]*>[\s\S]*?<\/script>/g, "");

// Remove Google Fonts preconnect and stylesheet links (should already be gone, but just in case)
html = html.replace(/<link[^>]+href="https:\/\/fonts\.googleapis\.com[^"]*"[^>]*\/?>/g, "");
html = html.replace(/<link[^>]+href="https:\/\/fonts\.gstatic\.com[^"]*"[^>]*\/?>/g, "");

// Remove data-website-id attributes from any remaining script tags
html = html.replace(/\s+data-website-id="[^"]*"/g, "");

writeFileSync(htmlPath, html, "utf-8");

const newSize = html.length;
const removed = originalSize - newSize;
console.log(`[postbuild-clean] Cleaned ${removed} bytes of dev/analytics scripts`);
console.log(`[postbuild-clean] Final size: ${(newSize / 1024).toFixed(1)} KB`);

// Verify no external references remain
const externalRefs = html.match(/src="https?:\/\/[^"]+"/g) || [];
const externalLinks = html.match(/href="https?:\/\/[^"]+"/g) || [];
if (externalRefs.length > 0 || externalLinks.length > 0) {
  console.warn("[postbuild-clean] WARNING: External references still present:");
  [...externalRefs, ...externalLinks].forEach(r => console.warn(" ", r));
} else {
  console.log("[postbuild-clean] ✓ No external references — file is fully self-contained");
}
