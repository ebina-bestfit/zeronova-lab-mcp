import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  OgpCheckerResponse,
  HeadingExtractorResponse,
  LinkCheckerResponse,
  SpeedCheckerResponse,
  AltCheckerResponse,
  SiteConfigCheckerResponse,
  SecurityHeadersCheckerResponse,
  CacheCheckerResponse,
  SchemaCheckerResponse,
  RedirectCheckerResponse,
  ImageCheckerResponse,
} from "../types.js";

// ---- Mock all client functions ----

const mockCheckOgp =
  vi.fn<(url: string) => Promise<OgpCheckerResponse>>();
const mockExtractHeadings =
  vi.fn<(url: string) => Promise<HeadingExtractorResponse>>();
const mockCheckLinks =
  vi.fn<(url: string) => Promise<LinkCheckerResponse>>();
const mockCheckSpeed = vi.fn<
  (
    url: string,
    strategy: "mobile" | "desktop",
  ) => Promise<SpeedCheckerResponse>
>();
const mockCheckAltAttributes =
  vi.fn<(url: string) => Promise<AltCheckerResponse>>();
const mockCheckSiteConfig =
  vi.fn<(url: string) => Promise<SiteConfigCheckerResponse>>();
const mockCheckSecurityHeaders =
  vi.fn<(url: string) => Promise<SecurityHeadersCheckerResponse>>();
const mockCheckCacheHeaders =
  vi.fn<(url: string) => Promise<CacheCheckerResponse>>();
const mockCheckSchemaCompleteness =
  vi.fn<(url: string) => Promise<SchemaCheckerResponse>>();
const mockCheckRedirectChain =
  vi.fn<(url: string) => Promise<RedirectCheckerResponse>>();
const mockCheckImageOptimization =
  vi.fn<(url: string) => Promise<ImageCheckerResponse>>();

vi.mock("../client.js", () => ({
  checkOgp: (...args: unknown[]) => mockCheckOgp(args[0] as string),
  extractHeadings: (...args: unknown[]) =>
    mockExtractHeadings(args[0] as string),
  checkLinks: (...args: unknown[]) => mockCheckLinks(args[0] as string),
  checkSpeed: (...args: unknown[]) =>
    mockCheckSpeed(args[0] as string, args[1] as "mobile" | "desktop"),
  checkAltAttributes: (...args: unknown[]) =>
    mockCheckAltAttributes(args[0] as string),
  checkSiteConfig: (...args: unknown[]) =>
    mockCheckSiteConfig(args[0] as string),
  checkSecurityHeaders: (...args: unknown[]) =>
    mockCheckSecurityHeaders(args[0] as string),
  checkCacheHeaders: (...args: unknown[]) =>
    mockCheckCacheHeaders(args[0] as string),
  checkSchemaCompleteness: (...args: unknown[]) =>
    mockCheckSchemaCompleteness(args[0] as string),
  checkRedirectChain: (...args: unknown[]) =>
    mockCheckRedirectChain(args[0] as string),
  checkImageOptimization: (...args: unknown[]) =>
    mockCheckImageOptimization(args[0] as string),
}));

const { handleSeoAudit } = await import(
  "../tools/tier2/seo-audit.js"
);
const { handleWebLaunchAudit } = await import(
  "../tools/tier2/web-launch-audit.js"
);
const { handleFreelanceDeliveryAudit } = await import(
  "../tools/tier2/freelance-delivery-audit.js"
);

function setupAllMocksSuccess() {
  mockCheckOgp.mockResolvedValue({
    ogp: {
      title: "Example Site - A Good Title",
      description:
        "This is a proper meta description that is long enough to pass validation at around 100 characters total.",
      image: "https://example.com/og.png",
      url: "https://example.com",
      type: "website",
      siteName: "Example",
    },
    twitter: {
      card: "summary_large_image",
      title: "Example Site",
      description: "Twitter description here",
      image: "https://example.com/twitter.png",
    },
    canonical: "https://example.com",
    jsonLd: [
      { type: "WebSite", valid: true, raw: '{"@type":"WebSite","name":"Example"}' },
    ],
    favicon: {
      icons: [{ rel: "icon", href: "/favicon.ico", type: "image/x-icon", sizes: "" }],
      hasFavicon: true,
      hasAppleTouchIcon: true,
      faviconIcoExists: true,
    },
    rawUrl: "https://example.com",
  });
  mockExtractHeadings.mockResolvedValue({
    headings: [
      { level: 1, text: "Main Heading" },
      { level: 2, text: "Sub Heading" },
    ],
    title: "Example Site",
    url: "https://example.com",
  });
  mockCheckLinks.mockResolvedValue({
    links: [
      {
        url: "https://example.com/about",
        text: "About",
        status: 200,
        statusText: "OK",
        isExternal: false,
      },
    ],
    title: "Example Site",
    checkedUrl: "https://example.com",
    totalLinks: 1,
  });
  mockCheckSpeed.mockResolvedValue({
    url: "https://example.com",
    strategy: "mobile",
    performanceScore: 90,
    metrics: {
      fcp: { score: 0.9, value: "1200", displayValue: "1.2 s" },
      lcp: { score: 0.9, value: "2000", displayValue: "2.0 s" },
      tbt: { score: 0.9, value: "100", displayValue: "100 ms" },
      cls: { score: 0.95, value: "0.05", displayValue: "0.05" },
      si: { score: 0.85, value: "1500", displayValue: "1.5 s" },
      tti: { score: 0.88, value: "1800", displayValue: "1.8 s" },
    },
    opportunities: [],
    accessibility: {
      score: 100,
      colorContrast: {
        score: 1,
        violations: [],
        violationCount: 0,
      },
    },
    fetchedAt: "2026-02-16T00:00:00Z",
  });
  mockCheckAltAttributes.mockResolvedValue({
    images: [
      {
        src: "https://example.com/img.png",
        alt: "An image",
        hasAlt: true,
        width: "200",
        height: "100",
        isDecorative: false,
        context: "present",
      },
    ],
    title: "Example Site",
    url: "https://example.com",
    summary: {
      total: 1,
      withAlt: 1,
      emptyAlt: 0,
      missingAlt: 0,
      decorative: 0,
    },
  });
  mockCheckSiteConfig.mockResolvedValue({
    robots: {
      exists: true,
      content: "User-agent: *\nAllow: /\nSitemap: https://example.com/sitemap.xml",
      hasSitemapDirective: true,
      sitemapUrls: ["https://example.com/sitemap.xml"],
      rules: 2,
      issues: [],
    },
    sitemap: {
      exists: true,
      url: "https://example.com/sitemap.xml",
      urlCount: 42,
      isIndex: false,
      issues: [],
    },
    domain: "https://example.com",
    checkedUrl: "https://example.com",
  });
  mockCheckSecurityHeaders.mockResolvedValue({
    headers: [
      { name: "Strict-Transport-Security", present: true, value: "max-age=31536000; includeSubDomains", status: "pass", detail: "HSTS設定済み" },
      { name: "Content-Security-Policy", present: true, value: "default-src 'self'", status: "pass", detail: "CSP設定済み" },
      { name: "X-Content-Type-Options", present: true, value: "nosniff", status: "pass", detail: "nosniff設定済み" },
      { name: "X-Frame-Options", present: true, value: "DENY", status: "pass", detail: "DENY設定済み" },
      { name: "Referrer-Policy", present: true, value: "strict-origin-when-cross-origin", status: "pass", detail: "Referrer-Policy設定済み" },
      { name: "Permissions-Policy", present: true, value: "camera=(), microphone=()", status: "pass", detail: "Permissions-Policy設定済み" },
    ],
    summary: {
      total: 6,
      present: 6,
      missing: 0,
      score: 100,
    },
    url: "https://example.com",
    checkedUrl: "https://example.com",
  });
  // Phase 3.5: New tool mocks
  mockCheckCacheHeaders.mockResolvedValue({
    headers: [
      { name: "Cache-Control", present: true, value: "public, max-age=3600", status: "pass", detail: "適切なキャッシュ設定", category: "browser" as const },
      { name: "ETag", present: true, value: '"abc123"', status: "pass", detail: "ETag設定済み", category: "validation" as const },
    ],
    summary: { total: 7, present: 5, missing: 2, score: 85, browserCache: "enabled" as const, cdnCache: "hit" as const },
    url: "https://example.com",
    checkedUrl: "https://example.com",
  });
  mockCheckSchemaCompleteness.mockResolvedValue({
    schemas: [{
      type: "WebSite", source: "json-ld" as const,
      properties: [{ name: "name", present: true, value: "Example", required: true }, { name: "url", present: true, value: "https://example.com", required: true }],
      status: "pass", issues: [], raw: '{"@type":"WebSite","name":"Example"}',
    }],
    summary: { totalSchemas: 1, passCount: 1, warnCount: 0, failCount: 0, score: 100, types: ["WebSite"] },
    checkedUrl: "https://example.com",
  });
  mockCheckRedirectChain.mockResolvedValue({
    hops: [{ url: "https://example.com", statusCode: 200, statusText: "OK", location: null, server: "nginx" }],
    summary: { totalHops: 0, finalUrl: "https://example.com", finalStatus: 200, hasLoop: false, hasHttpDowngrade: false, chainStatus: "pass" },
    checkedUrl: "https://example.com",
  });
  mockCheckImageOptimization.mockResolvedValue({
    images: [{ src: "https://example.com/img.webp", alt: "Image", hasWidth: true, hasHeight: true, hasLazy: true, format: "webp", fileSize: 30000, status: "pass", issues: [] }],
    summary: { totalImages: 1, totalOnPage: 1, passCount: 1, warnCount: 0, failCount: 0, score: 100, nextGenRate: 1, lazyRate: 1, dimensionRate: 1 },
    checkedUrl: "https://example.com",
  });
}

function resetAllMocks() {
  mockCheckOgp.mockReset();
  mockExtractHeadings.mockReset();
  mockCheckLinks.mockReset();
  mockCheckSpeed.mockReset();
  mockCheckAltAttributes.mockReset();
  mockCheckSiteConfig.mockReset();
  mockCheckSecurityHeaders.mockReset();
  mockCheckCacheHeaders.mockReset();
  mockCheckSchemaCompleteness.mockReset();
  mockCheckRedirectChain.mockReset();
  mockCheckImageOptimization.mockReset();
}

describe("handleSeoAudit", () => {
  beforeEach(resetAllMocks);

  it("returns an audit report with auditType seo-audit", async () => {
    setupAllMocksSuccess();
    const report = await handleSeoAudit("https://example.com");
    expect(report.auditType).toBe("seo-audit");
    // Phase 3.5: 16 original + 4 new (cache, schema, redirect, image)
    expect(report.checklist.total).toBe(20);
  });
});

describe("handleWebLaunchAudit", () => {
  beforeEach(resetAllMocks);

  it("returns an audit report with auditType web-launch-audit", async () => {
    setupAllMocksSuccess();
    const report = await handleWebLaunchAudit("https://example.com");
    expect(report.auditType).toBe("web-launch-audit");
    // Phase 3.5: 18 original + 4 new (cache, schema, image, redirect)
    expect(report.checklist.total).toBe(22);
    // Phase 2.7: only 1 manual item remains (og-brand)
    expect(report.checklist.manual).toBe(1);
  });
});

describe("handleFreelanceDeliveryAudit", () => {
  beforeEach(resetAllMocks);

  it("returns an audit report with auditType freelance-delivery-audit", async () => {
    setupAllMocksSuccess();
    const report = await handleFreelanceDeliveryAudit(
      "https://example.com",
    );
    expect(report.auditType).toBe("freelance-delivery-audit");
    // Phase 3.5: 13 original + 2 new (image, redirect)
    expect(report.checklist.total).toBe(15);
    // Phase 2.7: 3 manual items remain (proofreading, invoice, pricing)
    expect(report.checklist.manual).toBe(3);
  });
});
