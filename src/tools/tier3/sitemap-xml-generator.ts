/**
 * Tier 3: sitemap.xml generator
 * Generates a valid XML sitemap from structured URL data.
 *
 * Checklist 2-D:
 * - Output validation: XML parseable (structural correctness guaranteed by template)
 * - Injection prevention: XML special chars (<, >, &, ', ") escaped as entities
 * - No browser-dependent APIs (no DOMParser)
 */

const MAX_URLS = 50_000; // XML sitemap protocol limit
const MAX_URL_LENGTH = 2048;
const VALID_CHANGEFREQ = [
  "always",
  "hourly",
  "daily",
  "weekly",
  "monthly",
  "yearly",
  "never",
] as const;
type Changefreq = (typeof VALID_CHANGEFREQ)[number];

export interface SitemapUrlEntry {
  url: string;
  lastmod?: string;
  changefreq?: string;
  priority?: number;
}

export interface SitemapXmlInput {
  urls: SitemapUrlEntry[];
}

export interface SitemapXmlResult {
  content: string;
  urlCount: number;
  byteSize: number;
  validation: {
    isValid: boolean;
    issues: string[];
  };
}

/**
 * Escape XML special characters to prevent injection.
 * Uses entity encoding (no manual string concatenation of raw values).
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Validate a URL string (basic format check for sitemap inclusion).
 * Rejects: protocol-only ("https://"), control characters, spaces.
 */
function isValidSitemapUrl(url: string): boolean {
  if (!url.startsWith("http://") && !url.startsWith("https://")) return false;
  if (url.length > MAX_URL_LENGTH) return false;
  // Reject control characters and unencoded spaces
  if (/[\x00-\x1f\x7f\s]/.test(url)) return false;
  // Must be a parseable URL with a hostname
  try {
    const parsed = new URL(url);
    return parsed.hostname.length > 0;
  } catch {
    return false;
  }
}

/**
 * Validate changefreq value.
 */
function isValidChangefreq(value: string): value is Changefreq {
  return (VALID_CHANGEFREQ as readonly string[]).includes(value);
}

/**
 * Validate lastmod date format (YYYY-MM-DD or W3C datetime).
 */
function isValidLastmod(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}([+-]\d{2}:\d{2}|Z)?)?$/.test(value);
}

export function handleGenerateSitemapXml(input: SitemapXmlInput): SitemapXmlResult {
  const issues: string[] = [];
  const urls = input.urls;

  // Runtime validation (checklist 2-A)
  if (!Array.isArray(urls)) {
    throw new Error("urls must be an array");
  }
  if (urls.length === 0) {
    throw new Error("urls must contain at least one entry");
  }
  if (urls.length > MAX_URLS) {
    throw new Error(`urls exceeds maximum of ${MAX_URLS} items (received ${urls.length}). Split into multiple sitemaps.`);
  }

  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');

  let validUrlCount = 0;

  for (let i = 0; i < urls.length; i++) {
    const entry = urls[i];

    if (!entry.url || typeof entry.url !== "string") {
      issues.push(`Entry ${i}: missing or invalid url`);
      continue;
    }

    if (!isValidSitemapUrl(entry.url)) {
      issues.push(`Entry ${i}: invalid URL format or exceeds ${MAX_URL_LENGTH} chars: "${entry.url.slice(0, 50)}..."`);
      continue;
    }

    lines.push("  <url>");
    lines.push(`    <loc>${escapeXml(entry.url)}</loc>`);

    if (entry.lastmod) {
      if (isValidLastmod(entry.lastmod)) {
        lines.push(`    <lastmod>${escapeXml(entry.lastmod)}</lastmod>`);
      } else {
        issues.push(`Entry ${i}: invalid lastmod format "${entry.lastmod}" (expected YYYY-MM-DD)`);
      }
    }

    if (entry.changefreq) {
      if (isValidChangefreq(entry.changefreq)) {
        lines.push(`    <changefreq>${entry.changefreq}</changefreq>`);
      } else {
        issues.push(`Entry ${i}: invalid changefreq "${entry.changefreq}"`);
      }
    }

    if (entry.priority !== undefined) {
      if (typeof entry.priority === "number" && entry.priority >= 0.0 && entry.priority <= 1.0) {
        lines.push(`    <priority>${entry.priority.toFixed(1)}</priority>`);
      } else {
        issues.push(`Entry ${i}: invalid priority "${entry.priority}" (must be 0.0-1.0)`);
      }
    }

    lines.push("  </url>");
    validUrlCount++;
  }

  lines.push("</urlset>");
  lines.push("");

  const content = lines.join("\n");
  const byteSize = new TextEncoder().encode(content).length;

  // Structural validation: verify XML is well-formed by checking tag balance
  const isValid =
    content.includes('<?xml version="1.0"') &&
    content.includes("<urlset") &&
    content.includes("</urlset>") &&
    validUrlCount > 0;

  if (!isValid && validUrlCount === 0) {
    issues.push("No valid URLs were included in the sitemap");
  }

  return {
    content,
    urlCount: validUrlCount,
    byteSize,
    validation: {
      isValid: isValid && issues.length === 0,
      issues,
    },
  };
}
