#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { RateLimiter } from "./rate-limiter.js";
import { ApiError } from "./client.js";
import { handleAltChecker } from "./tools/tier1/alt-checker.js";
import { handleLinkChecker } from "./tools/tier1/link-checker.js";
import { handleSpeedChecker } from "./tools/tier1/speed-checker.js";
import { handleOgpChecker } from "./tools/tier1/ogp-checker.js";
import { handleHeadingExtractor } from "./tools/tier1/heading-extractor.js";
import { handleXCardPreview } from "./tools/tier1/x-card-preview.js";
import { handleSiteConfigChecker } from "./tools/tier1/site-config-checker.js";
import { handleSeoAudit } from "./tools/tier2/seo-audit.js";
import { handleWebLaunchAudit } from "./tools/tier2/web-launch-audit.js";
import { handleFreelanceDeliveryAudit } from "./tools/tier2/freelance-delivery-audit.js";
const rateLimiter = new RateLimiter({ maxRequests: 10, windowMs: 60_000 });
const MAX_URL_LENGTH = 2048;
/**
 * Validate URL for SSRF protection (MCP Server side defense layer).
 * Checks: protocol, length, private IP/localhost blocking.
 * Reference: mcp-dev-checklist.md section 2-B
 */
export function validateUrl(url) {
    if (url.length > MAX_URL_LENGTH) {
        throw new Error(`URL must be ${MAX_URL_LENGTH} characters or fewer (received ${url.length})`);
    }
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
        throw new Error("URL must start with http:// or https://");
    }
    let hostname;
    try {
        hostname = new URL(url).hostname.toLowerCase();
    }
    catch {
        throw new Error("Invalid URL format");
    }
    // Block localhost
    if (hostname === "localhost" || hostname === "[::1]") {
        throw new Error("Access to localhost is not allowed");
    }
    // Block private/reserved IP ranges
    const ipMatch = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipMatch) {
        const parts = ipMatch.slice(1).map(Number);
        const [a, b] = parts;
        if (a === 127 || // 127.0.0.0/8 (loopback)
            a === 10 || // 10.0.0.0/8 (private)
            (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12 (private)
            (a === 192 && b === 168) || // 192.168.0.0/16 (private)
            (a === 169 && b === 254) || // 169.254.0.0/16 (link-local)
            a === 0 // 0.0.0.0/8
        ) {
            throw new Error("Access to private/reserved IP addresses is not allowed");
        }
    }
    return url;
}
function checkRateLimit(toolName) {
    if (!rateLimiter.check(toolName)) {
        throw new Error(`Rate limit exceeded for ${toolName}. Please wait approximately 1 minute before retrying.`);
    }
}
/**
 * Format error messages for MCP response, sanitizing internal details.
 * Reference: mcp-dev-checklist.md section 2-A (error messages must not contain internal info)
 */
function formatError(error) {
    if (error instanceof ApiError) {
        const safeMessage = error.message
            .replace(/https?:\/\/[^\s]+\/api\/tools\/[^\s]*/g, "[API endpoint]")
            .replace(/\/home\/[^\s]+/g, "[internal path]")
            .replace(/\/usr\/[^\s]+/g, "[internal path]")
            .replace(/at\s+.+\(.+\)/g, "");
        return `API Error (${error.statusCode}): ${safeMessage.trim()}`;
    }
    if (error instanceof Error) {
        return error.message;
    }
    return "An unknown error occurred";
}
const server = new McpServer({
    name: "zeronova-lab",
    version: "0.2.2",
});
// Zod schemas with maxLength constraint (mcp-dev-checklist section 2-A)
const urlSchema = {
    url: z
        .string()
        .max(MAX_URL_LENGTH)
        .describe("Target webpage URL to analyze. Must start with https:// or http://. Maximum 2048 characters."),
};
const urlWithStrategySchema = {
    url: z
        .string()
        .max(MAX_URL_LENGTH)
        .describe("Target webpage URL to analyze. Must start with https:// or http://. Maximum 2048 characters."),
    strategy: z
        .enum(["mobile", "desktop"])
        .optional()
        .describe('Analysis strategy: "mobile" (default) or "desktop". Mobile analysis tests with a simulated mobile device.'),
};
// Tier 1: alt-checker
server.tool("check_alt_attributes", "Check alt attributes of all images on a webpage. Returns a structured report categorizing each image as having present, empty, missing, or decorative alt text, along with a summary count of total, withAlt, emptyAlt, missingAlt, and decorative images.", urlSchema, async ({ url }) => {
    try {
        const validUrl = validateUrl(url);
        checkRateLimit("check_alt_attributes");
        const result = await handleAltChecker(validUrl);
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
    }
    catch (error) {
        return {
            content: [{ type: "text", text: formatError(error) }],
            isError: true,
        };
    }
});
// Tier 1: link-checker
server.tool("check_links", "Check all links on a webpage for broken URLs. Returns each link's URL, anchor text, HTTP status code, statusText, whether it is external, and any warnings. Checks up to 50 links concurrently.", urlSchema, async ({ url }) => {
    try {
        const validUrl = validateUrl(url);
        checkRateLimit("check_links");
        const result = await handleLinkChecker(validUrl);
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
    }
    catch (error) {
        return {
            content: [{ type: "text", text: formatError(error) }],
            isError: true,
        };
    }
});
// Tier 1: speed-checker
server.tool("check_page_speed", "Analyze webpage performance using Google PageSpeed Insights. Returns Core Web Vitals (FCP, LCP, TBT, CLS, SI, TTI) with scores and display values, an overall performance score (0-100), and top optimization opportunities with estimated savings.", urlWithStrategySchema, async ({ url, strategy }) => {
    try {
        const validUrl = validateUrl(url);
        checkRateLimit("check_page_speed");
        const result = await handleSpeedChecker(validUrl, strategy);
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
    }
    catch (error) {
        return {
            content: [{ type: "text", text: formatError(error) }],
            isError: true,
        };
    }
});
// Tier 1: ogp-checker
server.tool("check_ogp", "Check Open Graph Protocol (OGP), Twitter Card meta tags, canonical URL, and JSON-LD structured data on a webpage. Returns structured OGP data (title, description, image, url, type, siteName), Twitter Card data (card, title, description, image), canonical URL (<link rel=\"canonical\">), and JSON-LD items (type, validity, raw content) with fallback chain resolution.", urlSchema, async ({ url }) => {
    try {
        const validUrl = validateUrl(url);
        checkRateLimit("check_ogp");
        const result = await handleOgpChecker(validUrl);
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
    }
    catch (error) {
        return {
            content: [{ type: "text", text: formatError(error) }],
            isError: true,
        };
    }
});
// Tier 1: heading-extractor
server.tool("extract_headings", "Extract all headings (H1-H6) from a webpage and return them as a flat list with level and text. Useful for SEO analysis of heading structure, checking H1 count, and verifying heading nesting order.", urlSchema, async ({ url }) => {
    try {
        const validUrl = validateUrl(url);
        checkRateLimit("extract_headings");
        const result = await handleHeadingExtractor(validUrl);
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
    }
    catch (error) {
        return {
            content: [{ type: "text", text: formatError(error) }],
            isError: true,
        };
    }
});
// Tier 1: x-card-preview
server.tool("check_x_card", "Check X (Twitter) Card settings for a webpage. Verifies twitter:card, twitter:title, twitter:description, and twitter:image meta tags. Returns resolved card data (with OGP fallback), validation results (hasCard, hasTitle, hasDescription, hasImage, isValid) with specific issues, and raw OGP fallback values.", urlSchema, async ({ url }) => {
    try {
        const validUrl = validateUrl(url);
        checkRateLimit("check_x_card");
        const result = await handleXCardPreview(validUrl);
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
    }
    catch (error) {
        return {
            content: [{ type: "text", text: formatError(error) }],
            isError: true,
        };
    }
});
// Tier 1: site-config-checker
server.tool("check_site_config", "Check robots.txt and XML sitemap configuration for a website. Extracts the domain from the given URL, fetches /robots.txt (validates syntax, Sitemap directives, rules count), and fetches sitemap.xml (validates XML structure, URL count, sitemap index detection). Returns structured results for both.", urlSchema, async ({ url }) => {
    try {
        const validUrl = validateUrl(url);
        checkRateLimit("check_site_config");
        const result = await handleSiteConfigChecker(validUrl);
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
    }
    catch (error) {
        return {
            content: [{ type: "text", text: formatError(error) }],
            isError: true,
        };
    }
});
// ---- Tier 2: Workflow tools ----
/**
 * Build MCP SDK progress notification sender from tool callback extra.
 * Checklist 2-C: MCP SDK progress notification.
 * Falls back to undefined if client does not support progress (no progressToken).
 *
 * Uses a generic sendFn to avoid coupling with ServerNotification union type.
 */
function buildSendProgress(progressToken, sendFn) {
    if (progressToken == null)
        return undefined;
    return async (progress, total, message) => {
        try {
            await sendFn("notifications/progress", progressToken, progress, total, message);
        }
        catch {
            // Progress notification failure is non-fatal
        }
    };
}
// Tier 2: run_seo_audit
server.tool("run_seo_audit", "Run a comprehensive SEO audit on a webpage. Internally chains 6 tools (OGP checker, heading extractor, link checker, page speed, alt checker, site config checker) and returns a unified report with a score (0-100), per-item pass/warn/fail status, and improvement suggestions. All 16 SEO items are auto-verified including canonical URL, JSON-LD, robots.txt, and XML sitemap.", urlSchema, async ({ url }, extra) => {
    try {
        const validUrl = validateUrl(url);
        checkRateLimit("run_seo_audit");
        const onProgress = (message) => {
            process.stderr.write(`[seo-audit] ${message}\n`);
        };
        const sendProgress = buildSendProgress(extra._meta?.progressToken, async (_method, pt, progress, total, message) => {
            await extra.sendNotification({
                method: "notifications/progress",
                params: { progressToken: pt, progress, total, message },
            });
        });
        const result = await handleSeoAudit(validUrl, onProgress, sendProgress);
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
    }
    catch (error) {
        return {
            content: [{ type: "text", text: formatError(error) }],
            isError: true,
        };
    }
});
// Tier 2: run_web_launch_audit
server.tool("run_web_launch_audit", "Run a pre-launch quality audit on a webpage. Internally chains 6 tools (OGP checker, heading extractor, link checker, page speed, alt checker, site config checker) and checks SEO settings (meta tags, canonical URL, JSON-LD, robots.txt, sitemap.xml), performance (Core Web Vitals), link integrity, alt attributes, and OGP/Twitter Card configuration. Returns a score (0-100) with per-item results. Also lists manual-check items for branding, accessibility, and security.", urlSchema, async ({ url }, extra) => {
    try {
        const validUrl = validateUrl(url);
        checkRateLimit("run_web_launch_audit");
        const onProgress = (message) => {
            process.stderr.write(`[web-launch-audit] ${message}\n`);
        };
        const sendProgress = buildSendProgress(extra._meta?.progressToken, async (_method, pt, progress, total, message) => {
            await extra.sendNotification({
                method: "notifications/progress",
                params: { progressToken: pt, progress, total, message },
            });
        });
        const result = await handleWebLaunchAudit(validUrl, onProgress, sendProgress);
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
    }
    catch (error) {
        return {
            content: [{ type: "text", text: formatError(error) }],
            isError: true,
        };
    }
});
// Tier 2: run_freelance_delivery_audit
server.tool("run_freelance_delivery_audit", "Run a pre-delivery quality audit for freelance web projects. Checks link integrity, page speed, alt attributes, meta tags, and OGP configuration. Returns a score (0-100) with per-item results. Also lists manual-check items for contrast, proofreading, invoicing, and security.", urlSchema, async ({ url }, extra) => {
    try {
        const validUrl = validateUrl(url);
        checkRateLimit("run_freelance_delivery_audit");
        const onProgress = (message) => {
            process.stderr.write(`[freelance-delivery-audit] ${message}\n`);
        };
        const sendProgress = buildSendProgress(extra._meta?.progressToken, async (_method, pt, progress, total, message) => {
            await extra.sendNotification({
                method: "notifications/progress",
                params: { progressToken: pt, progress, total, message },
            });
        });
        const result = await handleFreelanceDeliveryAudit(validUrl, onProgress, sendProgress);
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
    }
    catch (error) {
        return {
            content: [{ type: "text", text: formatError(error) }],
            isError: true,
        };
    }
});
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
main().catch((error) => {
    // Only log a generic message to stderr; do not expose internal details
    process.stderr.write(`MCP Server failed to start: ${error instanceof Error ? error.message : "unknown error"}\n`);
    process.exit(1);
});
//# sourceMappingURL=index.js.map