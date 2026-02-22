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

const { runWorkflow } = await import("../tools/tier2/workflow-runner.js");
const { seoAuditChecklist, webLaunchAuditChecklist } = await import(
  "../tools/tier2/checklist-data.js"
);

// ---- Test fixtures ----

function makeOgpResponse(
  overrides?: Partial<OgpCheckerResponse>,
): OgpCheckerResponse {
  return {
    ogp: {
      title: "Example Site - Good Title Here",
      description:
        "This is a proper meta description that is long enough to pass the check at approximately 100 characters or so.",
      image: "https://example.com/og.png",
      url: "https://example.com",
      type: "website",
      siteName: "Example",
    },
    twitter: {
      card: "summary_large_image",
      title: "Example Site",
      description: "Twitter description",
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
    ...overrides,
  };
}

function makeHeadingsResponse(
  overrides?: Partial<HeadingExtractorResponse>,
): HeadingExtractorResponse {
  return {
    headings: [
      { level: 1, text: "Main Heading" },
      { level: 2, text: "Sub Heading" },
      { level: 3, text: "Sub Sub Heading" },
    ],
    title: "Example Site",
    url: "https://example.com",
    ...overrides,
  };
}

function makeLinksResponse(
  overrides?: Partial<LinkCheckerResponse>,
): LinkCheckerResponse {
  return {
    links: [
      {
        url: "https://example.com/about",
        text: "About",
        status: 200,
        statusText: "OK",
        isExternal: false,
      },
      {
        url: "https://external.com",
        text: "External",
        status: 200,
        statusText: "OK",
        isExternal: true,
      },
    ],
    title: "Example Site",
    checkedUrl: "https://example.com",
    totalLinks: 2,
    ...overrides,
  };
}

function makeSpeedResponse(
  overrides?: Partial<SpeedCheckerResponse>,
): SpeedCheckerResponse {
  return {
    url: "https://example.com",
    strategy: "mobile",
    performanceScore: 95,
    metrics: {
      fcp: { score: 0.95, value: "1000", displayValue: "1.0 s" },
      lcp: { score: 0.9, value: "1800", displayValue: "1.8 s" },
      tbt: { score: 0.95, value: "50", displayValue: "50 ms" },
      cls: { score: 0.98, value: "0.02", displayValue: "0.02" },
      si: { score: 0.9, value: "1200", displayValue: "1.2 s" },
      tti: { score: 0.92, value: "1500", displayValue: "1.5 s" },
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
    ...overrides,
  };
}

function makeAltResponse(
  overrides?: Partial<AltCheckerResponse>,
): AltCheckerResponse {
  return {
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
    ...overrides,
  };
}

function makeSiteConfigResponse(
  overrides?: Partial<SiteConfigCheckerResponse>,
): SiteConfigCheckerResponse {
  return {
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
    ...overrides,
  };
}

function makeSecurityHeadersResponse(
  overrides?: Partial<SecurityHeadersCheckerResponse>,
): SecurityHeadersCheckerResponse {
  return {
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
    ...overrides,
  };
}

function makeCacheResponse(
  overrides?: Partial<CacheCheckerResponse>,
): CacheCheckerResponse {
  return {
    headers: [
      { name: "Cache-Control", present: true, value: "public, max-age=31536000", status: "pass", detail: "ブラウザキャッシュ設定済み", category: "browser" },
      { name: "ETag", present: true, value: "\"abc123\"", status: "pass", detail: "ETag設定済み", category: "validation" },
    ],
    summary: { total: 2, present: 2, missing: 0, score: 100, browserCache: "enabled", cdnCache: "hit" },
    url: "https://example.com",
    checkedUrl: "https://example.com",
    ...overrides,
  };
}

function makeSchemaResponse(
  overrides?: Partial<SchemaCheckerResponse>,
): SchemaCheckerResponse {
  return {
    schemas: [
      {
        type: "WebSite",
        source: "json-ld",
        properties: [
          { name: "name", present: true, value: "Example", required: true },
          { name: "url", present: true, value: "https://example.com", required: true },
        ],
        status: "pass",
        issues: [],
        raw: '{"@type":"WebSite"}',
      },
    ],
    summary: { totalSchemas: 1, passCount: 1, warnCount: 0, failCount: 0, score: 100, types: ["WebSite"] },
    checkedUrl: "https://example.com",
    ...overrides,
  };
}

function makeRedirectResponse(
  overrides?: Partial<RedirectCheckerResponse>,
): RedirectCheckerResponse {
  return {
    hops: [
      { url: "https://example.com", statusCode: 200, statusText: "OK", location: null, server: "nginx" },
    ],
    summary: { totalHops: 0, finalUrl: "https://example.com", finalStatus: 200, hasLoop: false, hasHttpDowngrade: false, chainStatus: "pass" },
    checkedUrl: "https://example.com",
    ...overrides,
  };
}

function makeImageResponse(
  overrides?: Partial<ImageCheckerResponse>,
): ImageCheckerResponse {
  return {
    images: [
      { src: "https://example.com/img.webp", alt: "Example", hasWidth: true, hasHeight: true, hasLazy: true, format: "webp", fileSize: 50000, status: "pass", issues: [] },
    ],
    summary: { totalImages: 1, totalOnPage: 1, passCount: 1, warnCount: 0, failCount: 0, score: 100, nextGenRate: 1, lazyRate: 1, dimensionRate: 1 },
    checkedUrl: "https://example.com",
    ...overrides,
  };
}

function setupAllMocksSuccess() {
  mockCheckOgp.mockResolvedValue(makeOgpResponse());
  mockExtractHeadings.mockResolvedValue(makeHeadingsResponse());
  mockCheckLinks.mockResolvedValue(makeLinksResponse());
  mockCheckSpeed.mockResolvedValue(makeSpeedResponse());
  mockCheckAltAttributes.mockResolvedValue(makeAltResponse());
  mockCheckSiteConfig.mockResolvedValue(makeSiteConfigResponse());
  mockCheckSecurityHeaders.mockResolvedValue(makeSecurityHeadersResponse());
  mockCheckCacheHeaders.mockResolvedValue(makeCacheResponse());
  mockCheckSchemaCompleteness.mockResolvedValue(makeSchemaResponse());
  mockCheckRedirectChain.mockResolvedValue(makeRedirectResponse());
  mockCheckImageOptimization.mockResolvedValue(makeImageResponse());
}

// ---- Tests ----

describe("runWorkflow", () => {
  beforeEach(() => {
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
  });

  it("returns a complete audit report with all tools passing", async () => {
    setupAllMocksSuccess();

    const report = await runWorkflow(
      "https://example.com",
      "seo-audit",
      seoAuditChecklist,
    );

    expect(report.url).toBe("https://example.com");
    expect(report.auditType).toBe("seo-audit");
    expect(report.score).toBeGreaterThan(0);
    expect(report.score).toBeLessThanOrEqual(100);
    expect(report.summary).toContain("自動検証");
    expect(report.checklist.total).toBe(seoAuditChecklist.length);
    expect(report.checklist.items).toHaveLength(seoAuditChecklist.length);

    // All items should be pass or warn (no fail with good data, no manual items for SEO audit)
    for (const item of report.checklist.items) {
      expect(["pass", "warn"]).toContain(item.status);
    }

    // SEO audit should have 0 manual items (all 20 auto-verifiable after Phase 3.5)
    expect(report.checklist.manual).toBe(0);
  });

  it("handles individual tool failure gracefully (partial results)", async () => {
    // Speed checker fails, others succeed
    mockCheckOgp.mockResolvedValue(makeOgpResponse());
    mockExtractHeadings.mockResolvedValue(makeHeadingsResponse());
    mockCheckLinks.mockResolvedValue(makeLinksResponse());
    mockCheckSpeed.mockRejectedValue(
      new Error("PageSpeed API unavailable"),
    );
    mockCheckAltAttributes.mockResolvedValue(makeAltResponse());
    mockCheckSiteConfig.mockResolvedValue(makeSiteConfigResponse());
    mockCheckSecurityHeaders.mockResolvedValue(makeSecurityHeadersResponse());
    mockCheckCacheHeaders.mockResolvedValue(makeCacheResponse());
    mockCheckSchemaCompleteness.mockResolvedValue(makeSchemaResponse());
    mockCheckRedirectChain.mockResolvedValue(makeRedirectResponse());
    mockCheckImageOptimization.mockResolvedValue(makeImageResponse());

    const report = await runWorkflow(
      "https://example.com",
      "seo-audit",
      seoAuditChecklist,
    );

    // Report should still be returned
    expect(report.url).toBe("https://example.com");

    // Checklist 2-C: score excludes error items (speed), only counts evaluated items
    // All non-speed items pass → score should be 100
    expect(report.score).toBe(100);

    // Summary should mention "未評価"
    expect(report.summary).toContain("未評価");

    // Speed-related items should be "error"
    const speedItems = report.checklist.items.filter((i) =>
      i.id.includes("performance") || i.id.includes("lcp") || i.id.includes("cls"),
    );
    for (const item of speedItems) {
      expect(item.status).toBe("error");
    }

    // Non-speed items should still have valid results
    const ogpItems = report.checklist.items.filter(
      (i) => i.id.includes("ogp") || i.id.includes("meta-title"),
    );
    for (const item of ogpItems) {
      expect(item.status).not.toBe("error");
    }

    // Speed result should show error
    expect(report.results["speed"]?.status).toBe("error");
  });

  it("detects failures: missing OGP title, broken links, missing alt", async () => {
    mockCheckOgp.mockResolvedValue(
      makeOgpResponse({
        ogp: {
          title: "",
          description: "",
          image: "",
          url: "https://example.com",
          type: "website",
          siteName: "",
        },
        twitter: { card: "", title: "", description: "", image: "" },
      }),
    );
    mockExtractHeadings.mockResolvedValue(
      makeHeadingsResponse({ headings: [] }),
    );
    mockCheckLinks.mockResolvedValue(
      makeLinksResponse({
        links: [
          {
            url: "https://example.com/broken",
            text: "Broken",
            status: 404,
            statusText: "Not Found",
            isExternal: false,
          },
        ],
        totalLinks: 1,
      }),
    );
    mockCheckSpeed.mockResolvedValue(
      makeSpeedResponse({ performanceScore: 30 }),
    );
    mockCheckAltAttributes.mockResolvedValue(
      makeAltResponse({
        summary: {
          total: 5,
          withAlt: 2,
          emptyAlt: 0,
          missingAlt: 3,
          decorative: 0,
        },
      }),
    );
    mockCheckSiteConfig.mockResolvedValue(makeSiteConfigResponse());
    mockCheckSecurityHeaders.mockResolvedValue(makeSecurityHeadersResponse());
    mockCheckCacheHeaders.mockResolvedValue(makeCacheResponse());
    mockCheckSchemaCompleteness.mockResolvedValue(makeSchemaResponse());
    mockCheckRedirectChain.mockResolvedValue(makeRedirectResponse());
    mockCheckImageOptimization.mockResolvedValue(makeImageResponse());

    const report = await runWorkflow(
      "https://example.com",
      "seo-audit",
      seoAuditChecklist,
    );

    expect(report.score).toBeLessThan(50);
    expect(report.checklist.failed).toBeGreaterThan(0);

    // Check specific failures
    const titleItem = report.checklist.items.find(
      (i) => i.id === "seo-meta-title",
    );
    expect(titleItem?.status).toBe("fail");

    const linkItem = report.checklist.items.find(
      (i) => i.id === "seo-no-broken-links",
    );
    expect(linkItem?.status).toBe("fail");

    const altItem = report.checklist.items.find(
      (i) => i.id === "seo-alt-attributes",
    );
    expect(altItem?.status).toBe("fail");

    const speedItem = report.checklist.items.find(
      (i) => i.id === "seo-performance-score",
    );
    expect(speedItem?.status).toBe("fail");
  });

  it("reports warn status for borderline values", async () => {
    // Title too short, description too short, LCP borderline
    mockCheckOgp.mockResolvedValue(
      makeOgpResponse({
        ogp: {
          title: "Short",
          description: "Short desc",
          image: "https://example.com/og.png",
          url: "https://example.com",
          type: "website",
          siteName: "Example",
        },
        twitter: {
          card: "summary_large_image",
          title: "Short",
          description: "Short",
          image: "https://example.com/twitter.png",
        },
      }),
    );
    mockExtractHeadings.mockResolvedValue(
      makeHeadingsResponse({
        headings: [
          { level: 1, text: "First H1" },
          { level: 1, text: "Second H1" },
        ],
      }),
    );
    mockCheckLinks.mockResolvedValue(makeLinksResponse());
    mockCheckSpeed.mockResolvedValue(
      makeSpeedResponse({
        performanceScore: 60,
        metrics: {
          fcp: { score: 0.7, value: "2000", displayValue: "2.0 s" },
          lcp: { score: 0.5, value: "3000", displayValue: "3.0 s" },
          tbt: { score: 0.8, value: "200", displayValue: "200 ms" },
          cls: { score: 0.6, value: "0.15", displayValue: "0.15" },
          si: { score: 0.7, value: "2500", displayValue: "2.5 s" },
          tti: { score: 0.75, value: "2200", displayValue: "2.2 s" },
        },
        opportunities: [],
        accessibility: {
          score: 100,
          colorContrast: { score: 1, violations: [], violationCount: 0 },
        },
        fetchedAt: "2026-02-16T00:00:00Z",
      }),
    );
    mockCheckAltAttributes.mockResolvedValue(makeAltResponse());
    mockCheckSiteConfig.mockResolvedValue(makeSiteConfigResponse());
    mockCheckSecurityHeaders.mockResolvedValue(makeSecurityHeadersResponse());
    mockCheckCacheHeaders.mockResolvedValue(makeCacheResponse());
    mockCheckSchemaCompleteness.mockResolvedValue(makeSchemaResponse());
    mockCheckRedirectChain.mockResolvedValue(makeRedirectResponse());
    mockCheckImageOptimization.mockResolvedValue(makeImageResponse());

    const report = await runWorkflow(
      "https://example.com",
      "seo-audit",
      seoAuditChecklist,
    );

    const titleItem = report.checklist.items.find(
      (i) => i.id === "seo-meta-title",
    );
    expect(titleItem?.status).toBe("warn");

    const descItem = report.checklist.items.find(
      (i) => i.id === "seo-meta-description",
    );
    expect(descItem?.status).toBe("warn");

    const h1Item = report.checklist.items.find(
      (i) => i.id === "seo-h1-unique",
    );
    expect(h1Item?.status).toBe("warn");

    const lcpItem = report.checklist.items.find(
      (i) => i.id === "seo-lcp",
    );
    expect(lcpItem?.status).toBe("warn");

    const clsItem = report.checklist.items.find(
      (i) => i.id === "seo-cls",
    );
    expect(clsItem?.status).toBe("warn");
  });

  it("calls onProgress callback with progress messages", async () => {
    setupAllMocksSuccess();
    const progressMessages: string[] = [];

    await runWorkflow(
      "https://example.com",
      "seo-audit",
      seoAuditChecklist,
      (message) => progressMessages.push(message),
    );

    // Should have start, per-tool (start + completion), and final completion messages
    expect(progressMessages.length).toBeGreaterThanOrEqual(3);
    expect(progressMessages[0]).toContain("監査開始");
    expect(progressMessages[progressMessages.length - 1]).toContain(
      "チェック完了",
    );
    // Should have progress messages like "1/6: OGPチェック中..."
    expect(
      progressMessages.some((m) => m.includes("OGPチェック中")),
    ).toBe(true);
  });

  it("emits tool completion results to onProgress (P2)", async () => {
    setupAllMocksSuccess();
    const progressMessages: string[] = [];

    await runWorkflow(
      "https://example.com",
      "seo-audit",
      seoAuditChecklist,
      (message) => progressMessages.push(message),
    );

    // Should have completion messages with ✓ prefix for each tool
    const completionMessages = progressMessages.filter((m) => m.startsWith("✓"));
    // SEO audit uses 10 tools
    expect(completionMessages.length).toBe(10);

    // OGP completion should show title and status
    const ogpCompletion = completionMessages.find((m) => m.includes("ogp:"));
    expect(ogpCompletion).toContain("PASS");
    expect(ogpCompletion).toContain("title:");

    // Links completion should show counts
    const linksCompletion = completionMessages.find((m) => m.includes("links:"));
    expect(linksCompletion).toContain("PASS");
    expect(linksCompletion).toContain("broken: 0");

    // Speed completion should show score
    const speedCompletion = completionMessages.find((m) => m.includes("speed:"));
    expect(speedCompletion).toContain("score: 95/100");

    // Headings completion should show H1 count
    const headingsCompletion = completionMessages.find((m) => m.includes("headings:"));
    expect(headingsCompletion).toContain("H1: 1");
  });

  it("emits error completion for failed tools (P2)", async () => {
    mockCheckOgp.mockResolvedValue(makeOgpResponse());
    mockExtractHeadings.mockResolvedValue(makeHeadingsResponse());
    mockCheckLinks.mockResolvedValue(makeLinksResponse());
    mockCheckSpeed.mockRejectedValue(new Error("PageSpeed API unavailable"));
    mockCheckAltAttributes.mockResolvedValue(makeAltResponse());
    mockCheckSiteConfig.mockResolvedValue(makeSiteConfigResponse());
    mockCheckSecurityHeaders.mockResolvedValue(makeSecurityHeadersResponse());
    mockCheckCacheHeaders.mockResolvedValue(makeCacheResponse());
    mockCheckSchemaCompleteness.mockResolvedValue(makeSchemaResponse());
    mockCheckRedirectChain.mockResolvedValue(makeRedirectResponse());
    mockCheckImageOptimization.mockResolvedValue(makeImageResponse());

    const progressMessages: string[] = [];

    await runWorkflow(
      "https://example.com",
      "seo-audit",
      seoAuditChecklist,
      (message) => progressMessages.push(message),
    );

    // Speed tool should show error completion
    const speedCompletion = progressMessages.find(
      (m) => m.includes("speed:") && m.startsWith("✗"),
    );
    expect(speedCompletion).toBeDefined();
    expect(speedCompletion).toContain("ERROR");
    expect(speedCompletion).toContain("PageSpeed API unavailable");

    // Other tools should show success
    const successCompletions = progressMessages.filter((m) => m.startsWith("✓"));
    expect(successCompletions.length).toBe(9); // 10 tools - 1 failed
  });

  it("deduplicates Tier 1 tool calls", async () => {
    setupAllMocksSuccess();

    await runWorkflow(
      "https://example.com",
      "seo-audit",
      seoAuditChecklist,
    );

    // Each tool should be called exactly once even though multiple items reference it
    expect(mockCheckOgp).toHaveBeenCalledTimes(1);
    expect(mockExtractHeadings).toHaveBeenCalledTimes(1);
    expect(mockCheckLinks).toHaveBeenCalledTimes(1);
    expect(mockCheckSpeed).toHaveBeenCalledTimes(1);
    expect(mockCheckAltAttributes).toHaveBeenCalledTimes(1);
    // SEO audit doesn't use securityHeaders
    expect(mockCheckSecurityHeaders).toHaveBeenCalledTimes(0);
  });

  it("returns score of 100 when all auto items pass", async () => {
    setupAllMocksSuccess();

    const report = await runWorkflow(
      "https://example.com",
      "seo-audit",
      seoAuditChecklist,
    );

    expect(report.score).toBe(100);
  });

  it("includes results section with per-tool summaries", async () => {
    setupAllMocksSuccess();

    const report = await runWorkflow(
      "https://example.com",
      "seo-audit",
      seoAuditChecklist,
    );

    expect(report.results).toHaveProperty("ogp");
    expect(report.results).toHaveProperty("headings");
    expect(report.results).toHaveProperty("links");
    expect(report.results).toHaveProperty("speed");
    expect(report.results).toHaveProperty("alt");
    expect(report.results).toHaveProperty("siteConfig");

    expect(report.results["ogp"].status).toBe("pass");
    expect(report.results["links"].status).toBe("pass");
    expect(report.results["alt"].status).toBe("pass");
    expect(report.results["siteConfig"].status).toBe("pass");
  });

  it("returns score 0 when all tools fail", async () => {
    mockCheckOgp.mockRejectedValue(new Error("API error"));
    mockExtractHeadings.mockRejectedValue(new Error("API error"));
    mockCheckLinks.mockRejectedValue(new Error("API error"));
    mockCheckSpeed.mockRejectedValue(new Error("API error"));
    mockCheckAltAttributes.mockRejectedValue(new Error("API error"));
    mockCheckSiteConfig.mockRejectedValue(new Error("API error"));
    mockCheckSecurityHeaders.mockRejectedValue(new Error("API error"));
    mockCheckCacheHeaders.mockRejectedValue(new Error("API error"));
    mockCheckSchemaCompleteness.mockRejectedValue(new Error("API error"));
    mockCheckRedirectChain.mockRejectedValue(new Error("API error"));
    mockCheckImageOptimization.mockRejectedValue(new Error("API error"));

    const report = await runWorkflow(
      "https://example.com",
      "seo-audit",
      seoAuditChecklist,
    );

    // Score = 0 when all tools fail (no evaluable items)
    expect(report.score).toBe(0);

    // All items should be "error" (SEO audit has 0 manual items after Phase 3.5)
    for (const item of report.checklist.items) {
      expect(item.status).toBe("error");
    }

    // Summary should mention "未評価"
    expect(report.summary).toContain("未評価");

    // SEO audit should have 0 manual items
    expect(report.checklist.manual).toBe(0);
  });

  it("distinguishes bot-blocked links (403 with warning) from truly broken links", async () => {
    mockCheckOgp.mockResolvedValue(makeOgpResponse());
    mockExtractHeadings.mockResolvedValue(makeHeadingsResponse());
    mockCheckLinks.mockResolvedValue(
      makeLinksResponse({
        links: [
          {
            url: "https://example.com/about",
            text: "About",
            status: 200,
            statusText: "OK",
            isExternal: false,
          },
          {
            url: "https://x.com/user",
            text: "X Profile",
            status: 403,
            statusText: "Forbidden",
            isExternal: true,
            warning:
              "このサイトはサーバーからのアクセスをブロックするため、ブラウザで直接確認してください",
          },
        ],
        totalLinks: 2,
      }),
    );
    mockCheckSpeed.mockResolvedValue(makeSpeedResponse());
    mockCheckAltAttributes.mockResolvedValue(makeAltResponse());
    mockCheckSiteConfig.mockResolvedValue(makeSiteConfigResponse());
    mockCheckSecurityHeaders.mockResolvedValue(makeSecurityHeadersResponse());
    mockCheckCacheHeaders.mockResolvedValue(makeCacheResponse());
    mockCheckSchemaCompleteness.mockResolvedValue(makeSchemaResponse());
    mockCheckRedirectChain.mockResolvedValue(makeRedirectResponse());
    mockCheckImageOptimization.mockResolvedValue(makeImageResponse());

    const report = await runWorkflow(
      "https://example.com",
      "seo-audit",
      seoAuditChecklist,
    );

    // Bot-blocked links should result in "warn", not "fail"
    const linkItem = report.checklist.items.find(
      (i) => i.id === "seo-no-broken-links",
    );
    expect(linkItem?.status).toBe("warn");
    expect(linkItem?.detail).toContain("ボットブロック");
    expect(linkItem?.detail).toContain("x.com");

    // Link result summary should also be "warn"
    expect(report.results["links"]?.status).toBe("warn");
  });

  it("reports fail only for truly broken links, warn for bot-blocked", async () => {
    mockCheckOgp.mockResolvedValue(makeOgpResponse());
    mockExtractHeadings.mockResolvedValue(makeHeadingsResponse());
    mockCheckLinks.mockResolvedValue(
      makeLinksResponse({
        links: [
          {
            url: "https://example.com/about",
            text: "About",
            status: 200,
            statusText: "OK",
            isExternal: false,
          },
          {
            url: "https://example.com/missing",
            text: "Missing Page",
            status: 404,
            statusText: "Not Found",
            isExternal: false,
          },
          {
            url: "https://x.com/user",
            text: "X Profile",
            status: 403,
            statusText: "Forbidden",
            isExternal: true,
            warning:
              "このサイトはサーバーからのアクセスをブロックするため、ブラウザで直接確認してください",
          },
        ],
        totalLinks: 3,
      }),
    );
    mockCheckSpeed.mockResolvedValue(makeSpeedResponse());
    mockCheckAltAttributes.mockResolvedValue(makeAltResponse());
    mockCheckSiteConfig.mockResolvedValue(makeSiteConfigResponse());
    mockCheckSecurityHeaders.mockResolvedValue(makeSecurityHeadersResponse());
    mockCheckCacheHeaders.mockResolvedValue(makeCacheResponse());
    mockCheckSchemaCompleteness.mockResolvedValue(makeSchemaResponse());
    mockCheckRedirectChain.mockResolvedValue(makeRedirectResponse());
    mockCheckImageOptimization.mockResolvedValue(makeImageResponse());

    const report = await runWorkflow(
      "https://example.com",
      "seo-audit",
      seoAuditChecklist,
    );

    // Truly broken link should result in "fail"
    const linkItem = report.checklist.items.find(
      (i) => i.id === "seo-no-broken-links",
    );
    expect(linkItem?.status).toBe("fail");
    expect(linkItem?.detail).toContain("1件のリンク切れ");
    expect(linkItem?.detail).toContain("missing");
    expect(linkItem?.detail).toContain("404");
    // Should also mention bot-blocked
    expect(linkItem?.detail).toContain("ボットブロック");
  });

  it("calls sendProgress for MCP progress notification", async () => {
    setupAllMocksSuccess();
    const sendProgress = vi.fn<
      (progress: number, total: number, message: string) => Promise<void>
    >();
    sendProgress.mockResolvedValue(undefined);

    await runWorkflow(
      "https://example.com",
      "seo-audit",
      seoAuditChecklist,
      undefined,
      sendProgress,
    );

    // Should have start (0), per-tool (1-10), and completion (11) = 12 calls
    // SEO audit uses 10 tools (ogp, headings, links, alt, siteConfig, cache, schema, redirect, image, speed)
    expect(sendProgress).toHaveBeenCalledTimes(12);
    // First call: progress 0 (start)
    expect(sendProgress.mock.calls[0][0]).toBe(0);
    expect(sendProgress.mock.calls[0][2]).toContain("監査開始");
    // Last call: completion
    expect(
      sendProgress.mock.calls[sendProgress.mock.calls.length - 1][2],
    ).toContain("チェック完了");
  });

  // ---- Phase 2.7: Web Launch Audit with securityHeaders ----

  it("web launch audit includes securityHeaders tool", async () => {
    setupAllMocksSuccess();

    const report = await runWorkflow(
      "https://example.com",
      "web-launch-audit",
      webLaunchAuditChecklist,
    );

    // securityHeaders should be called for web launch audit
    expect(mockCheckSecurityHeaders).toHaveBeenCalledTimes(1);

    // Should have securityHeaders in results
    expect(report.results).toHaveProperty("securityHeaders");
    expect(report.results["securityHeaders"].status).toBe("pass");

    // Security headers item should pass
    const secItem = report.checklist.items.find(
      (i) => i.id === "wl-security-headers",
    );
    expect(secItem?.status).toBe("pass");
  });

  it("web launch audit evaluates favicon from OGP data", async () => {
    setupAllMocksSuccess();

    const report = await runWorkflow(
      "https://example.com",
      "web-launch-audit",
      webLaunchAuditChecklist,
    );

    // Favicon should pass
    const faviconItem = report.checklist.items.find(
      (i) => i.id === "wl-favicon",
    );
    expect(faviconItem?.status).toBe("pass");
  });

  it("web launch audit evaluates color contrast from speed data", async () => {
    setupAllMocksSuccess();

    const report = await runWorkflow(
      "https://example.com",
      "web-launch-audit",
      webLaunchAuditChecklist,
    );

    // Contrast should pass
    const contrastItem = report.checklist.items.find(
      (i) => i.id === "wl-contrast",
    );
    expect(contrastItem?.status).toBe("pass");
  });

  it("detects missing favicon", async () => {
    mockCheckOgp.mockResolvedValue(
      makeOgpResponse({
        favicon: {
          icons: [],
          hasFavicon: false,
          hasAppleTouchIcon: false,
          faviconIcoExists: false,
        },
      }),
    );
    mockExtractHeadings.mockResolvedValue(makeHeadingsResponse());
    mockCheckLinks.mockResolvedValue(makeLinksResponse());
    mockCheckSpeed.mockResolvedValue(makeSpeedResponse());
    mockCheckAltAttributes.mockResolvedValue(makeAltResponse());
    mockCheckSiteConfig.mockResolvedValue(makeSiteConfigResponse());
    mockCheckSecurityHeaders.mockResolvedValue(makeSecurityHeadersResponse());
    mockCheckCacheHeaders.mockResolvedValue(makeCacheResponse());
    mockCheckSchemaCompleteness.mockResolvedValue(makeSchemaResponse());
    mockCheckRedirectChain.mockResolvedValue(makeRedirectResponse());
    mockCheckImageOptimization.mockResolvedValue(makeImageResponse());

    const report = await runWorkflow(
      "https://example.com",
      "web-launch-audit",
      webLaunchAuditChecklist,
    );

    const faviconItem = report.checklist.items.find(
      (i) => i.id === "wl-favicon",
    );
    expect(faviconItem?.status).toBe("fail");
    expect(faviconItem?.detail).toContain("ファビコンが未設定");
  });

  it("detects color contrast violations", async () => {
    mockCheckOgp.mockResolvedValue(makeOgpResponse());
    mockExtractHeadings.mockResolvedValue(makeHeadingsResponse());
    mockCheckLinks.mockResolvedValue(makeLinksResponse());
    mockCheckSpeed.mockResolvedValue(
      makeSpeedResponse({
        accessibility: {
          score: 70,
          colorContrast: {
            score: 0,
            violations: [
              { snippet: "<p class=\"light-text\">Low contrast text</p>", explanation: "Contrast ratio 2.5:1" },
            ],
            violationCount: 1,
          },
        },
      }),
    );
    mockCheckAltAttributes.mockResolvedValue(makeAltResponse());
    mockCheckSiteConfig.mockResolvedValue(makeSiteConfigResponse());
    mockCheckSecurityHeaders.mockResolvedValue(makeSecurityHeadersResponse());
    mockCheckCacheHeaders.mockResolvedValue(makeCacheResponse());
    mockCheckSchemaCompleteness.mockResolvedValue(makeSchemaResponse());
    mockCheckRedirectChain.mockResolvedValue(makeRedirectResponse());
    mockCheckImageOptimization.mockResolvedValue(makeImageResponse());

    const report = await runWorkflow(
      "https://example.com",
      "web-launch-audit",
      webLaunchAuditChecklist,
    );

    const contrastItem = report.checklist.items.find(
      (i) => i.id === "wl-contrast",
    );
    expect(contrastItem?.status).toBe("fail");
    expect(contrastItem?.detail).toContain("コントラスト違反");
  });

  it("detects weak security headers", async () => {
    mockCheckOgp.mockResolvedValue(makeOgpResponse());
    mockExtractHeadings.mockResolvedValue(makeHeadingsResponse());
    mockCheckLinks.mockResolvedValue(makeLinksResponse());
    mockCheckSpeed.mockResolvedValue(makeSpeedResponse());
    mockCheckAltAttributes.mockResolvedValue(makeAltResponse());
    mockCheckSiteConfig.mockResolvedValue(makeSiteConfigResponse());
    mockCheckSecurityHeaders.mockResolvedValue(
      makeSecurityHeadersResponse({
        headers: [
          { name: "Strict-Transport-Security", present: false, value: null, status: "fail", detail: "HSTS未設定" },
          { name: "Content-Security-Policy", present: false, value: null, status: "fail", detail: "CSP未設定" },
          { name: "X-Content-Type-Options", present: false, value: null, status: "fail", detail: "未設定" },
          { name: "X-Frame-Options", present: false, value: null, status: "fail", detail: "未設定" },
          { name: "Referrer-Policy", present: false, value: null, status: "fail", detail: "未設定" },
          { name: "Permissions-Policy", present: false, value: null, status: "fail", detail: "未設定" },
        ],
        summary: { total: 6, present: 0, missing: 6, score: 0 },
      }),
    );
    mockCheckCacheHeaders.mockResolvedValue(makeCacheResponse());
    mockCheckSchemaCompleteness.mockResolvedValue(makeSchemaResponse());
    mockCheckRedirectChain.mockResolvedValue(makeRedirectResponse());
    mockCheckImageOptimization.mockResolvedValue(makeImageResponse());

    const report = await runWorkflow(
      "https://example.com",
      "web-launch-audit",
      webLaunchAuditChecklist,
    );

    const secItem = report.checklist.items.find(
      (i) => i.id === "wl-security-headers",
    );
    expect(secItem?.status).toBe("fail");
    expect(secItem?.detail).toContain("セキュリティヘッダースコア: 0点");
  });
});
