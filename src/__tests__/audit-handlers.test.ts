import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  OgpCheckerResponse,
  HeadingExtractorResponse,
  LinkCheckerResponse,
  SpeedCheckerResponse,
  AltCheckerResponse,
  SiteConfigCheckerResponse,
  SecurityHeadersCheckerResponse,
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
}

describe("handleSeoAudit", () => {
  beforeEach(() => {
    mockCheckOgp.mockReset();
    mockExtractHeadings.mockReset();
    mockCheckLinks.mockReset();
    mockCheckSpeed.mockReset();
    mockCheckAltAttributes.mockReset();
    mockCheckSiteConfig.mockReset();
    mockCheckSecurityHeaders.mockReset();
  });

  it("returns an audit report with auditType seo-audit", async () => {
    setupAllMocksSuccess();
    const report = await handleSeoAudit("https://example.com");
    expect(report.auditType).toBe("seo-audit");
    expect(report.checklist.total).toBe(16);
  });
});

describe("handleWebLaunchAudit", () => {
  beforeEach(() => {
    mockCheckOgp.mockReset();
    mockExtractHeadings.mockReset();
    mockCheckLinks.mockReset();
    mockCheckSpeed.mockReset();
    mockCheckAltAttributes.mockReset();
    mockCheckSiteConfig.mockReset();
    mockCheckSecurityHeaders.mockReset();
  });

  it("returns an audit report with auditType web-launch-audit", async () => {
    setupAllMocksSuccess();
    const report = await handleWebLaunchAudit("https://example.com");
    expect(report.auditType).toBe("web-launch-audit");
    expect(report.checklist.total).toBe(18);
    // Phase 2.7: only 1 manual item remains (og-brand)
    // contrast, favicon, security-headers are now auto-verifiable
    expect(report.checklist.manual).toBe(1);
  });
});

describe("handleFreelanceDeliveryAudit", () => {
  beforeEach(() => {
    mockCheckOgp.mockReset();
    mockExtractHeadings.mockReset();
    mockCheckLinks.mockReset();
    mockCheckSpeed.mockReset();
    mockCheckAltAttributes.mockReset();
    mockCheckSiteConfig.mockReset();
    mockCheckSecurityHeaders.mockReset();
  });

  it("returns an audit report with auditType freelance-delivery-audit", async () => {
    setupAllMocksSuccess();
    const report = await handleFreelanceDeliveryAudit(
      "https://example.com",
    );
    expect(report.auditType).toBe("freelance-delivery-audit");
    expect(report.checklist.total).toBe(13);
    // Phase 2.7: 3 manual items remain (proofreading, invoice, pricing)
    // contrast, favicon, security-headers are now auto-verifiable
    expect(report.checklist.manual).toBe(3);
  });
});
