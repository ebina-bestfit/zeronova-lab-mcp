import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  OgpCheckerResponse,
  HeadingExtractorResponse,
  LinkCheckerResponse,
  SpeedCheckerResponse,
  AltCheckerResponse,
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

vi.mock("../client.js", () => ({
  checkOgp: (...args: unknown[]) => mockCheckOgp(args[0] as string),
  extractHeadings: (...args: unknown[]) =>
    mockExtractHeadings(args[0] as string),
  checkLinks: (...args: unknown[]) => mockCheckLinks(args[0] as string),
  checkSpeed: (...args: unknown[]) =>
    mockCheckSpeed(args[0] as string, args[1] as "mobile" | "desktop"),
  checkAltAttributes: (...args: unknown[]) =>
    mockCheckAltAttributes(args[0] as string),
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
}

describe("handleSeoAudit", () => {
  beforeEach(() => {
    mockCheckOgp.mockReset();
    mockExtractHeadings.mockReset();
    mockCheckLinks.mockReset();
    mockCheckSpeed.mockReset();
    mockCheckAltAttributes.mockReset();
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
  });

  it("returns an audit report with auditType web-launch-audit", async () => {
    setupAllMocksSuccess();
    const report = await handleWebLaunchAudit("https://example.com");
    expect(report.auditType).toBe("web-launch-audit");
    expect(report.checklist.total).toBe(18);
    // Should have more manual items than SEO audit (branding, security)
    expect(report.checklist.manual).toBeGreaterThanOrEqual(5);
  });
});

describe("handleFreelanceDeliveryAudit", () => {
  beforeEach(() => {
    mockCheckOgp.mockReset();
    mockExtractHeadings.mockReset();
    mockCheckLinks.mockReset();
    mockCheckSpeed.mockReset();
    mockCheckAltAttributes.mockReset();
  });

  it("returns an audit report with auditType freelance-delivery-audit", async () => {
    setupAllMocksSuccess();
    const report = await handleFreelanceDeliveryAudit(
      "https://example.com",
    );
    expect(report.auditType).toBe("freelance-delivery-audit");
    expect(report.checklist.total).toBe(13);
    // Freelance audit has manual items (contrast, proofreading, invoice, etc.)
    expect(report.checklist.manual).toBeGreaterThanOrEqual(4);
  });
});
