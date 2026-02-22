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
import { handleSecurityHeadersChecker } from "./tools/tier1/security-headers-checker.js";
import { handleCacheChecker } from "./tools/tier1/cache-checker.js";
import { handleSchemaChecker } from "./tools/tier1/schema-checker.js";
import { handleRedirectChecker } from "./tools/tier1/redirect-checker.js";
import { handleImageChecker } from "./tools/tier1/image-checker.js";
import { handleSeoAudit } from "./tools/tier2/seo-audit.js";
import { handleWebLaunchAudit } from "./tools/tier2/web-launch-audit.js";
import { handleFreelanceDeliveryAudit } from "./tools/tier2/freelance-delivery-audit.js";
import { handleGenerateRobotsTxt } from "./tools/tier3/robots-txt-generator.js";
import { handleGenerateSitemapXml } from "./tools/tier3/sitemap-xml-generator.js";
import { handleGenerateHtaccess } from "./tools/tier3/htaccess-generator.js";
import { handleGenerateJsonLd } from "./tools/tier3/jsonld-generator.js";
import { handleGenerateMetaTags } from "./tools/tier3/meta-tag-generator.js";
import {
  summarizeAltChecker,
  summarizeLinkChecker,
  summarizeSpeedChecker,
  summarizeOgpChecker,
  summarizeHeadingExtractor,
  summarizeXCardPreview,
  summarizeSiteConfigChecker,
  summarizeSecurityHeaders,
  summarizeCacheChecker,
  summarizeSchemaChecker,
  summarizeRedirectChecker,
  summarizeImageChecker,
  summarizeAuditReport,
} from "./format-summary.js";

const rateLimiter = new RateLimiter({ maxRequests: 10, windowMs: 60_000 });

const MAX_URL_LENGTH = 2048;

/**
 * Validate URL for SSRF protection (MCP Server side defense layer).
 * Checks: protocol, length, private IP/localhost blocking.
 * Reference: mcp-dev-checklist.md section 2-B
 */
export function validateUrl(url: string): string {
  if (url.length > MAX_URL_LENGTH) {
    throw new Error(
      `URL must be ${MAX_URL_LENGTH} characters or fewer (received ${url.length})`,
    );
  }
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    throw new Error("URL must start with http:// or https://");
  }

  let hostname: string;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    throw new Error("Invalid URL format");
  }

  // Block localhost
  if (hostname === "localhost" || hostname === "[::1]") {
    throw new Error("Access to localhost is not allowed");
  }

  // Block .local / .internal domains (can resolve to private IPs)
  if (hostname.endsWith(".local") || hostname.endsWith(".internal")) {
    throw new Error(
      "Access to .local / .internal domains is not allowed",
    );
  }

  // Block private/reserved IP ranges
  const ipMatch = hostname.match(
    /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/,
  );
  if (ipMatch) {
    const parts = ipMatch.slice(1).map(Number);
    const [a, b] = parts;
    if (
      a === 127 || // 127.0.0.0/8 (loopback)
      a === 10 || // 10.0.0.0/8 (private)
      (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12 (private)
      (a === 192 && b === 168) || // 192.168.0.0/16 (private)
      (a === 169 && b === 254) || // 169.254.0.0/16 (link-local)
      a === 0 // 0.0.0.0/8
    ) {
      throw new Error(
        "Access to private/reserved IP addresses is not allowed",
      );
    }
  }

  return url;
}

function checkRateLimit(toolName: string): void {
  if (!rateLimiter.check(toolName)) {
    throw new Error(
      `Rate limit exceeded for ${toolName}. Please wait approximately 1 minute before retrying.`,
    );
  }
}

/**
 * Format error messages for MCP response, sanitizing internal details.
 * Reference: mcp-dev-checklist.md section 2-A (error messages must not contain internal info)
 */
function formatError(error: unknown): string {
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
  version: "0.5.0",
});

// Zod schemas with maxLength constraint (mcp-dev-checklist section 2-A)
const urlSchema = {
  url: z
    .string()
    .max(MAX_URL_LENGTH)
    .describe(
      "Target webpage URL to analyze. Must start with https:// or http://. Maximum 2048 characters.",
    ),
};

const urlWithStrategySchema = {
  url: z
    .string()
    .max(MAX_URL_LENGTH)
    .describe(
      "Target webpage URL to analyze. Must start with https:// or http://. Maximum 2048 characters.",
    ),
  strategy: z
    .enum(["mobile", "desktop"])
    .optional()
    .describe(
      'Analysis strategy: "mobile" (default) or "desktop". Mobile analysis tests with a simulated mobile device.',
    ),
};

// Tier 1: alt-checker
server.tool(
  "check_alt_attributes",
  "Check alt attributes of all images on a webpage. Returns a structured report categorizing each image as having present, empty, missing, or decorative alt text, along with a summary count of total, withAlt, emptyAlt, missingAlt, and decorative images.",
  urlSchema,
  async ({ url }) => {
    try {
      const validUrl = validateUrl(url);
      checkRateLimit("check_alt_attributes");
      const result = await handleAltChecker(validUrl);
      return {
        content: [
          { type: "text", text: summarizeAltChecker(result) },
          { type: "text", text: JSON.stringify(result, null, 2) },
        ],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: formatError(error) }],
        isError: true,
      };
    }
  },
);

// Tier 1: link-checker
server.tool(
  "check_links",
  "Check all links on a webpage for broken URLs. Returns each link's URL, anchor text, HTTP status code, statusText, whether it is external, and any warnings. Checks up to 50 links concurrently.",
  urlSchema,
  async ({ url }) => {
    try {
      const validUrl = validateUrl(url);
      checkRateLimit("check_links");
      const result = await handleLinkChecker(validUrl);
      return {
        content: [
          { type: "text", text: summarizeLinkChecker(result) },
          { type: "text", text: JSON.stringify(result, null, 2) },
        ],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: formatError(error) }],
        isError: true,
      };
    }
  },
);

// Tier 1: speed-checker
server.tool(
  "check_page_speed",
  "Analyze webpage performance using Google PageSpeed Insights. Returns Core Web Vitals (FCP, LCP, TBT, CLS, SI, TTI) with scores and display values, an overall performance score (0-100), and top optimization opportunities with estimated savings.",
  urlWithStrategySchema,
  async ({ url, strategy }) => {
    try {
      const validUrl = validateUrl(url);
      checkRateLimit("check_page_speed");
      const result = await handleSpeedChecker(validUrl, strategy);
      return {
        content: [
          { type: "text", text: summarizeSpeedChecker(result) },
          { type: "text", text: JSON.stringify(result, null, 2) },
        ],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: formatError(error) }],
        isError: true,
      };
    }
  },
);

// Tier 1: ogp-checker
server.tool(
  "check_ogp",
  "Check Open Graph Protocol (OGP), Twitter Card meta tags, canonical URL, and JSON-LD structured data on a webpage. Returns structured OGP data (title, description, image, url, type, siteName), Twitter Card data (card, title, description, image), canonical URL (<link rel=\"canonical\">), and JSON-LD items (type, validity, raw content) with fallback chain resolution.",
  urlSchema,
  async ({ url }) => {
    try {
      const validUrl = validateUrl(url);
      checkRateLimit("check_ogp");
      const result = await handleOgpChecker(validUrl);
      return {
        content: [
          { type: "text", text: summarizeOgpChecker(result) },
          { type: "text", text: JSON.stringify(result, null, 2) },
        ],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: formatError(error) }],
        isError: true,
      };
    }
  },
);

// Tier 1: heading-extractor
server.tool(
  "extract_headings",
  "Extract all headings (H1-H6) from a webpage and return them as a flat list with level and text. Useful for SEO analysis of heading structure, checking H1 count, and verifying heading nesting order.",
  urlSchema,
  async ({ url }) => {
    try {
      const validUrl = validateUrl(url);
      checkRateLimit("extract_headings");
      const result = await handleHeadingExtractor(validUrl);
      return {
        content: [
          { type: "text", text: summarizeHeadingExtractor(result) },
          { type: "text", text: JSON.stringify(result, null, 2) },
        ],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: formatError(error) }],
        isError: true,
      };
    }
  },
);

// Tier 1: x-card-preview
server.tool(
  "check_x_card",
  "Check X (Twitter) Card settings for a webpage. Verifies twitter:card, twitter:title, twitter:description, and twitter:image meta tags. Returns resolved card data (with OGP fallback), validation results (hasCard, hasTitle, hasDescription, hasImage, isValid) with specific issues, and raw OGP fallback values.",
  urlSchema,
  async ({ url }) => {
    try {
      const validUrl = validateUrl(url);
      checkRateLimit("check_x_card");
      const result = await handleXCardPreview(validUrl);
      return {
        content: [
          { type: "text", text: summarizeXCardPreview(result) },
          { type: "text", text: JSON.stringify(result, null, 2) },
        ],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: formatError(error) }],
        isError: true,
      };
    }
  },
);

// Tier 1: site-config-checker
server.tool(
  "check_site_config",
  "Check robots.txt and XML sitemap configuration for a website. Extracts the domain from the given URL, fetches /robots.txt (validates syntax, Sitemap directives, rules count), and fetches sitemap.xml (validates XML structure, URL count, sitemap index detection). Returns structured results for both.",
  urlSchema,
  async ({ url }) => {
    try {
      const validUrl = validateUrl(url);
      checkRateLimit("check_site_config");
      const result = await handleSiteConfigChecker(validUrl);
      return {
        content: [
          { type: "text", text: summarizeSiteConfigChecker(result) },
          { type: "text", text: JSON.stringify(result, null, 2) },
        ],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: formatError(error) }],
        isError: true,
      };
    }
  },
);

// Tier 1: security-headers-checker (Phase 2.7)
server.tool(
  "check_security_headers",
  "Check HTTP security headers on a webpage. Inspects 6 key security headers: Strict-Transport-Security (HSTS), Content-Security-Policy (CSP), X-Content-Type-Options, X-Frame-Options, Referrer-Policy, and Permissions-Policy. Returns each header's presence, value, and pass/warn/fail status with specific recommendations, plus an overall security score (0-100).",
  urlSchema,
  async ({ url }) => {
    try {
      const validUrl = validateUrl(url);
      checkRateLimit("check_security_headers");
      const result = await handleSecurityHeadersChecker(validUrl);
      return {
        content: [
          { type: "text", text: summarizeSecurityHeaders(result) },
          { type: "text", text: JSON.stringify(result, null, 2) },
        ],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: formatError(error) }],
        isError: true,
      };
    }
  },
);

// Tier 1: cache-checker (Phase 3.5)
server.tool(
  "check_cache_headers",
  "Check HTTP cache and compression headers on a webpage. Inspects Cache-Control, ETag, Last-Modified, Age, Vary, CDN cache status, and Expires headers. Returns each header's presence, value, status (pass/warn/fail), and category (browser/cdn/validation), plus a summary with browser cache status (enabled/partial/disabled), CDN cache status (hit/miss/unknown), and an overall score (0-100).",
  urlSchema,
  async ({ url }) => {
    try {
      const validUrl = validateUrl(url);
      checkRateLimit("check_cache_headers");
      const result = await handleCacheChecker(validUrl);
      return {
        content: [
          { type: "text", text: summarizeCacheChecker(result) },
          { type: "text", text: JSON.stringify(result, null, 2) },
        ],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: formatError(error) }],
        isError: true,
      };
    }
  },
);

// Tier 1: schema-checker (Phase 3.5)
server.tool(
  "check_schema_completeness",
  "Check JSON-LD structured data completeness on a webpage. Validates each schema against Google Rich Results requirements, checking required and recommended properties. Supports 18 schema types: Article, BlogPosting, NewsArticle, FAQPage, Product, BreadcrumbList, Organization, Person, WebSite, WebPage, LocalBusiness, SoftwareApplication, ItemList, VideoObject, HowTo, Recipe, Event, Review. Returns per-schema property details, issues, and an overall score (0-100).",
  urlSchema,
  async ({ url }) => {
    try {
      const validUrl = validateUrl(url);
      checkRateLimit("check_schema_completeness");
      const result = await handleSchemaChecker(validUrl);
      return {
        content: [
          { type: "text", text: summarizeSchemaChecker(result) },
          { type: "text", text: JSON.stringify(result, null, 2) },
        ],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: formatError(error) }],
        isError: true,
      };
    }
  },
);

// Tier 1: redirect-checker (Phase 3.5)
server.tool(
  "check_redirect_chain",
  "Check the redirect chain for a URL. Follows up to 10 redirects, recording each hop's URL, status code, Location header, and Server header. Detects redirect loops, HTTPS-to-HTTP downgrades, and excessive chain length. Returns hop details and a summary with total hops, final URL/status, loop/downgrade flags, and chain status (pass: 0-1 hops / warn: 2-3 hops / fail: loop, downgrade, or 4+ hops).",
  urlSchema,
  async ({ url }) => {
    try {
      const validUrl = validateUrl(url);
      checkRateLimit("check_redirect_chain");
      const result = await handleRedirectChecker(validUrl);
      return {
        content: [
          { type: "text", text: summarizeRedirectChecker(result) },
          { type: "text", text: JSON.stringify(result, null, 2) },
        ],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: formatError(error) }],
        isError: true,
      };
    }
  },
);

// Tier 1: image-checker (Phase 3.5)
server.tool(
  "check_image_optimization",
  "Check image optimization on a webpage. Analyzes up to 20 images for format (WebP/AVIF preferred), file size (<100KB pass / 100-500KB warn / >500KB fail), lazy loading (loading=\"lazy\"), responsive attributes (srcset/sizes), and dimension attributes (width/height for CLS prevention). Returns per-image details with issues and a summary with score (0-100), next-gen format rate, lazy loading rate, and dimension rate.",
  urlSchema,
  async ({ url }) => {
    try {
      const validUrl = validateUrl(url);
      checkRateLimit("check_image_optimization");
      const result = await handleImageChecker(validUrl);
      return {
        content: [
          { type: "text", text: summarizeImageChecker(result) },
          { type: "text", text: JSON.stringify(result, null, 2) },
        ],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: formatError(error) }],
        isError: true,
      };
    }
  },
);

// ---- Tier 2: Workflow tools ----

/**
 * Build MCP SDK progress notification sender from tool callback extra.
 * Checklist 2-C: MCP SDK progress notification.
 * Falls back to undefined if client does not support progress (no progressToken).
 *
 * Uses a generic sendFn to avoid coupling with ServerNotification union type.
 */
function buildSendProgress(
  progressToken: string | number | undefined,
  sendFn: (method: string, progressToken: string | number, progress: number, total: number, message: string) => Promise<void>,
): ((progress: number, total: number, message: string) => Promise<void>) | undefined {
  if (progressToken == null) return undefined;
  return async (progress: number, total: number, message: string) => {
    try {
      await sendFn("notifications/progress", progressToken, progress, total, message);
    } catch {
      // Progress notification failure is non-fatal
    }
  };
}

// Tier 2: run_seo_audit
server.tool(
  "run_seo_audit",
  "Run a comprehensive SEO audit on a webpage. Internally chains 10 tools (OGP checker, heading extractor, link checker, page speed with accessibility, alt checker, site config checker, cache headers checker, schema completeness checker, redirect chain checker, image optimization checker) and returns a unified report with a score (0-100), per-item pass/warn/fail status, and improvement suggestions. All 20 SEO items are auto-verified including canonical URL, JSON-LD completeness, robots.txt, XML sitemap, cache headers, redirect chains, and image optimization.",
  urlSchema,
  async ({ url }, extra) => {
    try {
      const validUrl = validateUrl(url);
      checkRateLimit("run_seo_audit");
      const onProgress = (message: string) => {
        process.stderr.write(`[seo-audit] ${message}\n`);
      };
      const sendProgress = buildSendProgress(
        extra._meta?.progressToken,
        async (_method, pt, progress, total, message) => {
          await extra.sendNotification({
            method: "notifications/progress" as const,
            params: { progressToken: pt, progress, total, message },
          });
        },
      );
      const result = await handleSeoAudit(validUrl, onProgress, sendProgress);
      return {
        content: [
          { type: "text", text: summarizeAuditReport(result) },
          { type: "text", text: JSON.stringify(result, null, 2) },
        ],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: formatError(error) }],
        isError: true,
      };
    }
  },
);

// Tier 2: run_web_launch_audit
server.tool(
  "run_web_launch_audit",
  "Run a pre-launch quality audit on a webpage. Internally chains 11 tools (OGP checker, heading extractor, link checker, page speed with accessibility, alt checker, site config checker, security headers checker, cache headers checker, schema completeness checker, redirect chain checker, image optimization checker) and checks SEO settings, performance (Core Web Vitals), link integrity, alt attributes, color contrast, favicon, security headers, cache configuration, redirect chains, and image optimization. Returns a score (0-100) with per-item results.",
  urlSchema,
  async ({ url }, extra) => {
    try {
      const validUrl = validateUrl(url);
      checkRateLimit("run_web_launch_audit");
      const onProgress = (message: string) => {
        process.stderr.write(`[web-launch-audit] ${message}\n`);
      };
      const sendProgress = buildSendProgress(
        extra._meta?.progressToken,
        async (_method, pt, progress, total, message) => {
          await extra.sendNotification({
            method: "notifications/progress" as const,
            params: { progressToken: pt, progress, total, message },
          });
        },
      );
      const result = await handleWebLaunchAudit(validUrl, onProgress, sendProgress);
      return {
        content: [
          { type: "text", text: summarizeAuditReport(result) },
          { type: "text", text: JSON.stringify(result, null, 2) },
        ],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: formatError(error) }],
        isError: true,
      };
    }
  },
);

// Tier 2: run_freelance_delivery_audit
server.tool(
  "run_freelance_delivery_audit",
  "Run a pre-delivery quality audit for freelance web projects. Checks link integrity, page speed, alt attributes, color contrast, meta tags, OGP configuration, favicon, security headers, image optimization, and redirect chains. Returns a score (0-100) with per-item results. Also lists manual-check items for proofreading and invoicing.",
  urlSchema,
  async ({ url }, extra) => {
    try {
      const validUrl = validateUrl(url);
      checkRateLimit("run_freelance_delivery_audit");
      const onProgress = (message: string) => {
        process.stderr.write(`[freelance-delivery-audit] ${message}\n`);
      };
      const sendProgress = buildSendProgress(
        extra._meta?.progressToken,
        async (_method, pt, progress, total, message) => {
          await extra.sendNotification({
            method: "notifications/progress" as const,
            params: { progressToken: pt, progress, total, message },
          });
        },
      );
      const result = await handleFreelanceDeliveryAudit(validUrl, onProgress, sendProgress);
      return {
        content: [
          { type: "text", text: summarizeAuditReport(result) },
          { type: "text", text: JSON.stringify(result, null, 2) },
        ],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: formatError(error) }],
        isError: true,
      };
    }
  },
);

// ---- Tier 3: Config file generation tools ----

/**
 * Tier 3 generation timeout (checklist 2-A: 生成処理 → 10秒).
 * Tier 3 tools are synchronous (pure string generation), so true preemptive
 * timeout is not possible without worker_threads. Input size constraints
 * (max 50K URLs, max 100 paths, etc.) already bound execution time.
 * This post-hoc check serves as a safety net for unexpected edge cases.
 */
const TIER3_TIMEOUT_MS = 10_000;

function checkTier3Timeout(startMs: number, toolName: string): void {
  const elapsed = Date.now() - startMs;
  if (elapsed > TIER3_TIMEOUT_MS) {
    throw new Error(
      `${toolName} generation exceeded timeout (${elapsed}ms > ${TIER3_TIMEOUT_MS}ms). Try reducing the input size.`,
    );
  }
}

// Tier 3: generate_robots_txt
server.tool(
  "generate_robots_txt",
  'Generate a valid robots.txt file from structured input. Provide a sitemap URL, disallow/allow paths (up to 100 each), optional user-agent and crawl-delay. Returns the generated robots.txt content with line count and validation results. Example input: { "sitemapUrl": "https://example.com/sitemap.xml", "disallowPaths": ["/admin/", "/tmp/"], "allowPaths": ["/admin/public/"] }',
  {
    sitemapUrl: z
      .string()
      .max(2048)
      .optional()
      .describe("Sitemap URL to include (must start with http:// or https://)"),
    disallowPaths: z
      .array(z.string().max(2048))
      .max(100)
      .optional()
      .describe("Paths to block from crawling (max 100 paths). Each path should start with /"),
    allowPaths: z
      .array(z.string().max(2048))
      .max(100)
      .optional()
      .describe("Paths to explicitly allow crawling (max 100 paths). Each path should start with /"),
    userAgent: z
      .string()
      .max(200)
      .optional()
      .describe('User-agent to target (default: "*" for all crawlers)'),
    crawlDelay: z
      .number()
      .min(0)
      .max(60)
      .optional()
      .describe("Crawl-delay in seconds (0-60). Most search engines ignore this except Bing/Yandex."),
  },
  async (params) => {
    try {
      checkRateLimit("generate_robots_txt");
      const start = Date.now();
      const result = handleGenerateRobotsTxt(params);
      checkTier3Timeout(start, "generate_robots_txt");
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: formatError(error) }],
        isError: true,
      };
    }
  },
);

// Tier 3: generate_sitemap_xml
server.tool(
  "generate_sitemap_xml",
  'Generate a valid XML sitemap from a list of URLs. Each URL entry can include optional lastmod (YYYY-MM-DD), changefreq (always/hourly/daily/weekly/monthly/yearly/never), and priority (0.0-1.0). Returns well-formed sitemap XML with URL count and byte size. Maximum 50,000 URLs per sitemap. Example input: { "urls": [{ "url": "https://example.com/", "lastmod": "2026-02-18", "changefreq": "weekly", "priority": 1.0 }] }',
  {
    urls: z
      .array(
        z.object({
          url: z.string().max(2048).describe("Page URL (must start with http:// or https://)"),
          lastmod: z
            .string()
            .max(30)
            .optional()
            .describe("Last modification date (YYYY-MM-DD or W3C datetime format)"),
          changefreq: z
            .enum(["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"])
            .optional()
            .describe("Expected change frequency"),
          priority: z
            .number()
            .min(0)
            .max(1)
            .optional()
            .describe("URL priority relative to other URLs on the site (0.0-1.0)"),
        }),
      )
      .min(1)
      .max(50000)
      .describe("Array of URL entries to include in the sitemap (1-50,000 entries)"),
  },
  async ({ urls }) => {
    try {
      checkRateLimit("generate_sitemap_xml");
      const start = Date.now();
      const result = handleGenerateSitemapXml({ urls });
      checkTier3Timeout(start, "generate_sitemap_xml");
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: formatError(error) }],
        isError: true,
      };
    }
  },
);

// Tier 3: generate_htaccess
server.tool(
  "generate_htaccess",
  'Generate a valid Apache .htaccess file with redirect rules, cache control, and gzip compression settings. Redirect rules support 301/302/307/308 status codes with RewriteRule syntax. Includes injection prevention for RewriteRule patterns. Example input: { "redirectRules": [{ "from": "/old-page", "to": "/new-page", "statusCode": 301 }], "compressionEnabled": true, "forceHttps": true }',
  {
    redirectRules: z
      .array(
        z.object({
          from: z.string().max(2048).describe("Source path (e.g., /old-page)"),
          to: z.string().max(2048).describe("Destination path or URL (e.g., /new-page or https://example.com/new)"),
          statusCode: z
            .number()
            .min(301)
            .max(308)
            .optional()
            .describe("HTTP redirect status code: 301 (permanent), 302 (temporary), 307, or 308. Default: 301"),
        }),
      )
      .max(100)
      .optional()
      .describe("Redirect rules (max 100). Each rule maps a source path to a destination."),
    cacheControl: z
      .array(
        z.object({
          extension: z.string().max(20).describe("File extension without dot (e.g., 'css', 'js', 'png')"),
          maxAge: z
            .number()
            .min(0)
            .max(31536000)
            .describe("Cache duration in seconds (max 31536000 = 1 year)"),
        }),
      )
      .max(20)
      .optional()
      .describe("Cache-Control rules per file extension"),
    compressionEnabled: z
      .boolean()
      .optional()
      .describe("Enable gzip compression for text/HTML/CSS/JS/JSON/XML/SVG (default: false)"),
    forceHttps: z
      .boolean()
      .optional()
      .describe("Add HTTP to HTTPS redirect rule (default: false)"),
    removeTrailingSlash: z
      .boolean()
      .optional()
      .describe("Add trailing slash removal rule (default: false)"),
  },
  async (params) => {
    try {
      checkRateLimit("generate_htaccess");
      const start = Date.now();
      const result = handleGenerateHtaccess(params);
      checkTier3Timeout(start, "generate_htaccess");
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: formatError(error) }],
        isError: true,
      };
    }
  },
);

// Tier 3: generate_jsonld
server.tool(
  "generate_jsonld",
  'Generate Schema.org-compliant JSON-LD structured data. Supports 16 schema types: Article, BlogPosting, Product, Organization, Person, LocalBusiness, WebSite, WebPage, FAQPage, BreadcrumbList, SoftwareApplication, Event, Recipe, VideoObject, HowTo, Course. Returns both raw JSON and a ready-to-use <script> tag. Validates required fields per schema type. Example input: { "schemaType": "Article", "data": { "headline": "My Article", "author": { "@type": "Person", "name": "Author" }, "datePublished": "2026-02-18" } }',
  {
    schemaType: z
      .string()
      .max(100)
      .describe("Schema.org type (e.g., Article, BlogPosting, Product, Organization, Person, LocalBusiness, WebSite, FAQPage, BreadcrumbList, SoftwareApplication, Event, etc.)"),
    data: z
      .record(z.string(), z.unknown())
      .describe("Schema.org properties for the specified type. Provide all relevant fields as key-value pairs."),
    includeGraph: z
      .boolean()
      .optional()
      .describe("Wrap output in @graph array for multi-item structures (default: false)"),
  },
  async (params) => {
    try {
      checkRateLimit("generate_jsonld");
      const start = Date.now();
      const result = handleGenerateJsonLd(params);
      checkTier3Timeout(start, "generate_jsonld");
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: formatError(error) }],
        isError: true,
      };
    }
  },
);

// Tier 3: generate_meta_tags
server.tool(
  "generate_meta_tags",
  'Generate SEO-optimized HTML meta tags including title, description, keywords, Open Graph, Twitter Card, and canonical URL. Returns the generated HTML with tag count, SEO analysis (title/description length status), and validation. Example input: { "title": "My Page Title", "description": "A comprehensive description of the page content", "ogpData": { "image": "https://example.com/og.png", "type": "website" }, "twitterCard": { "card": "summary_large_image" }, "canonicalUrl": "https://example.com/page" }',
  {
    title: z
      .string()
      .max(200)
      .describe("Page title (recommended: 30-60 characters for SEO)"),
    description: z
      .string()
      .max(500)
      .describe("Meta description (recommended: 70-160 characters for SEO)"),
    keywords: z
      .array(z.string().max(100))
      .max(30)
      .optional()
      .describe("SEO keywords (max 30 keywords, each max 100 chars)"),
    ogpData: z
      .object({
        title: z.string().max(200).optional().describe("OGP title (falls back to page title)"),
        description: z.string().max(500).optional().describe("OGP description (falls back to page description)"),
        image: z.string().max(2048).optional().describe("OGP image URL (recommended: 1200x630px)"),
        url: z.string().max(2048).optional().describe("Canonical URL for OGP"),
        type: z.string().max(50).optional().describe('OGP type (e.g., "website", "article")'),
        siteName: z.string().max(200).optional().describe("Site name for OGP"),
        locale: z.string().max(20).optional().describe('Locale (e.g., "ja_JP", "en_US")'),
      })
      .optional()
      .describe("Open Graph Protocol data"),
    twitterCard: z
      .object({
        card: z.string().max(50).optional().describe('Card type: "summary", "summary_large_image", "app", "player"'),
        site: z.string().max(100).optional().describe("Twitter @username of the site"),
        creator: z.string().max(100).optional().describe("Twitter @username of the content creator"),
        title: z.string().max(200).optional().describe("Twitter card title (falls back to page title)"),
        description: z.string().max(500).optional().describe("Twitter card description (falls back to page description)"),
        image: z.string().max(2048).optional().describe("Twitter card image URL"),
      })
      .optional()
      .describe("Twitter Card data"),
    canonicalUrl: z
      .string()
      .max(2048)
      .optional()
      .describe("Canonical URL (must start with http:// or https://)"),
    charset: z
      .string()
      .max(20)
      .optional()
      .describe('Character encoding (default: "UTF-8")'),
    viewport: z
      .string()
      .max(200)
      .optional()
      .describe('Viewport meta content (default: "width=device-width, initial-scale=1.0")'),
    robots: z
      .string()
      .max(100)
      .optional()
      .describe('Robots directive (e.g., "index, follow", "noindex, nofollow")'),
  },
  async (params) => {
    try {
      checkRateLimit("generate_meta_tags");
      const start = Date.now();
      const result = handleGenerateMetaTags(params);
      checkTier3Timeout(start, "generate_meta_tags");
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: formatError(error) }],
        isError: true,
      };
    }
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  // Only log a generic message to stderr; do not expose internal details
  process.stderr.write(
    `MCP Server failed to start: ${error instanceof Error ? error.message : "unknown error"}\n`,
  );
  process.exit(1);
});
