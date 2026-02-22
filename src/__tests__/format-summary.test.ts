import { describe, it, expect } from "vitest";
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
} from "../format-summary.js";
import type {
  AltCheckerResponse,
  LinkCheckerResponse,
  SpeedCheckerResponse,
  OgpCheckerResponse,
  HeadingExtractorResponse,
  SiteConfigCheckerResponse,
  SecurityHeadersCheckerResponse,
  CacheCheckerResponse,
  SchemaCheckerResponse,
  RedirectCheckerResponse,
  ImageCheckerResponse,
  AuditReport,
} from "../types.js";
import type { XCardPreviewResponse } from "../tools/tier1/x-card-preview.js";

// ---- Helpers ----

function makeSpeedMetric(score = 0.9, value = "1.2 s", displayValue = "1.2 s") {
  return { score, value, displayValue };
}

// ---- Tests ----

describe("format-summary", () => {
  describe("summarizeAltChecker", () => {
    it("includes summary counts and missing images", () => {
      const input: AltCheckerResponse = {
        images: [
          { src: "/img/a.png", alt: "ok", hasAlt: true, width: null, height: null, isDecorative: false, context: "present" },
          { src: "/img/b.png", alt: null, hasAlt: false, width: null, height: null, isDecorative: false, context: "missing" },
        ],
        title: "Test",
        url: "https://example.com",
        summary: { total: 2, withAlt: 1, emptyAlt: 0, missingAlt: 1, decorative: 0 },
      };
      const result = summarizeAltChecker(input);
      expect(result).toContain("Total images: 2");
      expect(result).toContain("Missing alt: 1");
      expect(result).toContain("/img/b.png");
    });

    it("does not list images when none missing", () => {
      const input: AltCheckerResponse = {
        images: [{ src: "/a.png", alt: "ok", hasAlt: true, width: null, height: null, isDecorative: false, context: "present" }],
        title: "T", url: "https://e.com",
        summary: { total: 1, withAlt: 1, emptyAlt: 0, missingAlt: 0, decorative: 0 },
      };
      const result = summarizeAltChecker(input);
      expect(result).not.toContain("Images missing alt");
    });
  });

  describe("summarizeLinkChecker", () => {
    it("lists broken and bot-blocked counts", () => {
      const input: LinkCheckerResponse = {
        links: [
          { url: "https://ok.com", text: "ok", status: 200, statusText: "OK", isExternal: true },
          { url: "https://broken.com", text: "broken", status: 404, statusText: "Not Found", isExternal: true },
          { url: "https://x.com/post", text: "x", status: 403, statusText: "Forbidden", isExternal: true, warning: "Bot blocked" },
        ],
        title: "T", checkedUrl: "https://e.com", totalLinks: 3,
      };
      const result = summarizeLinkChecker(input);
      expect(result).toContain("Total links: 3");
      expect(result).toContain("Broken: 1");
      expect(result).toContain("Bot-blocked");
      expect(result).toContain("https://broken.com");
    });
  });

  describe("summarizeSpeedChecker", () => {
    it("includes score table and opportunities", () => {
      const input: SpeedCheckerResponse = {
        url: "https://e.com", strategy: "mobile", performanceScore: 85,
        metrics: {
          fcp: makeSpeedMetric(), lcp: makeSpeedMetric(),
          tbt: makeSpeedMetric(), cls: makeSpeedMetric(0.95, "0.05", "0.05"),
          si: makeSpeedMetric(), tti: makeSpeedMetric(),
        },
        opportunities: [{ title: "Optimize images", savings: "2.1 s" }],
        accessibility: { score: 92, colorContrast: { score: 0.8, violations: [], violationCount: 0 } },
        fetchedAt: "2026-02-22T00:00:00Z",
      };
      const result = summarizeSpeedChecker(input);
      expect(result).toContain("Performance: 85/100");
      expect(result).toContain("| FCP |");
      expect(result).toContain("Optimize images");
      expect(result).toContain("Accessibility score: 92/100");
    });
  });

  describe("summarizeOgpChecker", () => {
    it("shows OGP fields as table", () => {
      const input: OgpCheckerResponse = {
        ogp: { title: "My Site", description: "Desc", image: "https://e.com/og.png", url: "https://e.com", type: "website", siteName: "S" },
        twitter: { card: "summary_large_image", title: "", description: "", image: "" },
        canonical: "https://e.com",
        jsonLd: [{ type: "Organization", valid: true, raw: "{}" }],
        favicon: { icons: [{ rel: "icon", href: "/f.ico", type: "", sizes: "" }], hasFavicon: true, hasAppleTouchIcon: false, faviconIcoExists: true },
        rawUrl: "https://e.com",
      };
      const result = summarizeOgpChecker(input);
      expect(result).toContain("| og:title | SET |");
      expect(result).toContain("My Site");
      expect(result).toContain("| canonical | SET |");
      expect(result).toContain("Organization");
      expect(result).toContain("| Favicon | SET |");
    });
  });

  describe("summarizeHeadingExtractor", () => {
    it("shows H1 count and hierarchy skips", () => {
      const input: HeadingExtractorResponse = {
        headings: [
          { level: 1, text: "Title" },
          { level: 3, text: "Skipped H2" },
        ],
        title: "T", url: "https://e.com",
      };
      const result = summarizeHeadingExtractor(input);
      expect(result).toContain("H1 count: 1");
      expect(result).toContain("H1 → H3");
    });
  });

  describe("summarizeSiteConfigChecker", () => {
    it("shows robots and sitemap status", () => {
      const input: SiteConfigCheckerResponse = {
        robots: { exists: true, content: "User-agent: *", hasSitemapDirective: true, sitemapUrls: [], rules: 3, issues: [] },
        sitemap: { exists: true, url: "https://e.com/sitemap.xml", urlCount: 50, isIndex: false, issues: [] },
        domain: "e.com", checkedUrl: "https://e.com",
      };
      const result = summarizeSiteConfigChecker(input);
      expect(result).toContain("robots.txt**: EXISTS");
      expect(result).toContain("sitemap.xml**: EXISTS");
      expect(result).toContain("URLs: 50");
    });
  });

  describe("summarizeSecurityHeaders", () => {
    it("shows score and header table", () => {
      const input: SecurityHeadersCheckerResponse = {
        headers: [
          { name: "HSTS", present: true, value: "max-age=31536000", status: "pass", detail: "OK" },
          { name: "CSP", present: false, value: null, status: "fail", detail: "Missing" },
        ],
        summary: { total: 6, present: 4, missing: 2, score: 67 },
        url: "https://e.com", checkedUrl: "https://e.com",
      };
      const result = summarizeSecurityHeaders(input);
      expect(result).toContain("Score: 67/100");
      expect(result).toContain("| HSTS | PASS |");
      expect(result).toContain("| CSP | FAIL |");
    });
  });

  describe("summarizeCacheChecker", () => {
    it("shows score, browser/CDN status, and header table", () => {
      const input: CacheCheckerResponse = {
        headers: [
          { name: "Cache-Control", present: true, value: "public, max-age=3600", status: "pass", detail: "OK", category: "browser" },
        ],
        summary: { total: 5, present: 3, missing: 2, score: 60, browserCache: "enabled", cdnCache: "hit" },
        url: "https://e.com", checkedUrl: "https://e.com",
      };
      const result = summarizeCacheChecker(input);
      expect(result).toContain("Score: 60/100");
      expect(result).toContain("Browser cache: enabled");
      expect(result).toContain("CDN cache: hit");
    });
  });

  describe("summarizeSchemaChecker", () => {
    it("shows score and schema table", () => {
      const input: SchemaCheckerResponse = {
        schemas: [
          { type: "BlogPosting", source: "json-ld", properties: [], status: "pass", issues: [], raw: "{}" },
          { type: "Organization", source: "json-ld", properties: [], status: "warn", issues: ["Missing logo"], raw: "{}" },
        ],
        summary: { totalSchemas: 2, passCount: 1, warnCount: 1, failCount: 0, score: 75, types: ["BlogPosting", "Organization"] },
        checkedUrl: "https://e.com",
      };
      const result = summarizeSchemaChecker(input);
      expect(result).toContain("Score: 75/100");
      expect(result).toContain("BlogPosting, Organization");
      expect(result).toContain("| BlogPosting | PASS |");
      expect(result).toContain("| Organization | WARN | Missing logo |");
    });
  });

  describe("summarizeRedirectChecker", () => {
    it("shows hop count and warnings", () => {
      const input: RedirectCheckerResponse = {
        hops: [
          { url: "http://e.com", statusCode: 301, statusText: "Moved", location: "https://e.com", server: "nginx" },
        ],
        summary: { totalHops: 1, finalUrl: "https://e.com", finalStatus: 200, hasLoop: false, hasHttpDowngrade: false, chainStatus: "pass" },
        checkedUrl: "http://e.com",
      };
      const result = summarizeRedirectChecker(input);
      expect(result).toContain("Status: PASS");
      expect(result).toContain("Hops: 1");
      expect(result).toContain("301 http://e.com");
      expect(result).not.toContain("LOOP");
    });

    it("shows warnings for loop and downgrade", () => {
      const input: RedirectCheckerResponse = {
        hops: [],
        summary: { totalHops: 5, finalUrl: "http://e.com", finalStatus: 200, hasLoop: true, hasHttpDowngrade: true, chainStatus: "fail" },
        checkedUrl: "https://e.com",
      };
      const result = summarizeRedirectChecker(input);
      expect(result).toContain("LOOP DETECTED");
      expect(result).toContain("HTTPS→HTTP DOWNGRADE");
    });
  });

  describe("summarizeImageChecker", () => {
    it("shows score and rates", () => {
      const input: ImageCheckerResponse = {
        images: [
          { src: "/big.jpg", alt: "img", hasWidth: false, hasHeight: false, hasLazy: false, format: "jpeg", fileSize: 600000, status: "fail", issues: ["File too large", "Not next-gen format"] },
        ],
        summary: { totalImages: 1, totalOnPage: 5, passCount: 0, warnCount: 0, failCount: 1, score: 30, nextGenRate: 0, lazyRate: 0, dimensionRate: 0 },
        checkedUrl: "https://e.com",
      };
      const result = summarizeImageChecker(input);
      expect(result).toContain("Score: 30/100");
      expect(result).toContain("Next-gen format rate: 0%");
      expect(result).toContain("/big.jpg: File too large, Not next-gen format");
    });
  });

  describe("summarizeXCardPreview", () => {
    it("shows validation status and issues", () => {
      const input: XCardPreviewResponse = {
        url: "https://e.com",
        card: { type: "summary_large_image", title: "Title", description: "Desc", image: "https://e.com/img.png" },
        validation: { hasCard: true, hasTitle: true, hasDescription: true, hasImage: true, isValid: true, issues: [] },
        ogpFallback: { title: "T", description: "D", image: "I" },
      };
      const result = summarizeXCardPreview(input);
      expect(result).toContain("Valid: YES");
      expect(result).toContain("summary_large_image");
      expect(result).not.toContain("Issues");
    });

    it("shows issues when invalid", () => {
      const input: XCardPreviewResponse = {
        url: "https://e.com",
        card: { type: "summary", title: "", description: "", image: "" },
        validation: { hasCard: false, hasTitle: false, hasDescription: false, hasImage: false, isValid: false, issues: ["twitter:card missing"] },
        ogpFallback: { title: "", description: "", image: "" },
      };
      const result = summarizeXCardPreview(input);
      expect(result).toContain("Valid: NO");
      expect(result).toContain("twitter:card missing");
    });
  });

  describe("summarizeAuditReport", () => {
    it("shows score, checklist table, and action items", () => {
      const report: AuditReport = {
        url: "https://e.com",
        auditType: "seo_audit",
        score: 75,
        summary: "test",
        results: {},
        checklist: {
          total: 3, passed: 1, warned: 1, failed: 1, errors: 0, manual: 0,
          items: [
            { id: "1", category: "seo", label: "Meta title", status: "pass", detail: "OK" },
            { id: "2", category: "seo", label: "Meta desc", status: "warn", detail: "Too short" },
            { id: "3", category: "perf", label: "LCP", status: "fail", detail: "4.2s > 2.5s threshold" },
          ],
        },
      };
      const result = summarizeAuditReport(report);
      expect(result).toContain("SEO Audit");
      expect(result).toContain("Score: 75/100");
      expect(result).toContain("| 1 | seo | Meta title | PASS |");
      expect(result).toContain("| 3 | perf | LCP | FAIL |");
      expect(result).toContain("**Action required:**");
      expect(result).toContain("LCP: 4.2s > 2.5s threshold");
    });

    it("shows manual checks section", () => {
      const report: AuditReport = {
        url: "https://e.com",
        auditType: "freelance_delivery_audit",
        score: 90,
        summary: "test",
        results: {},
        checklist: {
          total: 2, passed: 1, warned: 0, failed: 0, errors: 0, manual: 1,
          items: [
            { id: "1", category: "seo", label: "Meta title", status: "pass" },
            { id: "2", category: "manual", label: "Proofreading", status: "manual" },
          ],
        },
      };
      const result = summarizeAuditReport(report);
      expect(result).toContain("Freelance Delivery Audit");
      expect(result).toContain("**Manual checks needed:**");
      expect(result).toContain("Proofreading");
    });

    it("formats web_launch_audit type", () => {
      const report: AuditReport = {
        url: "https://e.com", auditType: "web_launch_audit", score: 50,
        summary: "test", results: {},
        checklist: { total: 0, passed: 0, warned: 0, failed: 0, errors: 0, manual: 0, items: [] },
      };
      const result = summarizeAuditReport(report);
      expect(result).toContain("Web Launch Audit");
    });
  });
});
