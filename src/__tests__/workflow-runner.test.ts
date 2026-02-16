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

const { runWorkflow } = await import("../tools/tier2/workflow-runner.js");
const { seoAuditChecklist } = await import(
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

function setupAllMocksSuccess() {
  mockCheckOgp.mockResolvedValue(makeOgpResponse());
  mockExtractHeadings.mockResolvedValue(makeHeadingsResponse());
  mockCheckLinks.mockResolvedValue(makeLinksResponse());
  mockCheckSpeed.mockResolvedValue(makeSpeedResponse());
  mockCheckAltAttributes.mockResolvedValue(makeAltResponse());
}

// ---- Tests ----

describe("runWorkflow", () => {
  beforeEach(() => {
    mockCheckOgp.mockReset();
    mockExtractHeadings.mockReset();
    mockCheckLinks.mockReset();
    mockCheckSpeed.mockReset();
    mockCheckAltAttributes.mockReset();
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

    // All auto-verifiable items should be pass or warn (no fail with good data)
    const autoItems = report.checklist.items.filter(
      (i) => i.status !== "manual",
    );
    for (const item of autoItems) {
      expect(["pass", "warn"]).toContain(item.status);
    }

    // Manual items should be present
    const manualItems = report.checklist.items.filter(
      (i) => i.status === "manual",
    );
    expect(manualItems.length).toBeGreaterThan(0);
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
        fetchedAt: "2026-02-16T00:00:00Z",
      }),
    );
    mockCheckAltAttributes.mockResolvedValue(makeAltResponse());

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

    // Should have start, per-tool, and completion messages
    expect(progressMessages.length).toBeGreaterThanOrEqual(3);
    expect(progressMessages[0]).toContain("監査開始");
    expect(progressMessages[progressMessages.length - 1]).toContain(
      "チェック完了",
    );
    // Should have progress messages like "1/5: OGPチェック中..."
    expect(
      progressMessages.some((m) => m.includes("OGPチェック中")),
    ).toBe(true);
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

    expect(report.results["ogp"].status).toBe("pass");
    expect(report.results["links"].status).toBe("pass");
    expect(report.results["alt"].status).toBe("pass");
  });

  it("returns score 0 when all tools fail", async () => {
    mockCheckOgp.mockRejectedValue(new Error("API error"));
    mockExtractHeadings.mockRejectedValue(new Error("API error"));
    mockCheckLinks.mockRejectedValue(new Error("API error"));
    mockCheckSpeed.mockRejectedValue(new Error("API error"));
    mockCheckAltAttributes.mockRejectedValue(new Error("API error"));

    const report = await runWorkflow(
      "https://example.com",
      "seo-audit",
      seoAuditChecklist,
    );

    // Score = 0 when all tools fail (no evaluable items)
    expect(report.score).toBe(0);

    // All auto items should be "error"
    const autoItems = report.checklist.items.filter(
      (i) => i.status !== "manual",
    );
    for (const item of autoItems) {
      expect(item.status).toBe("error");
    }

    // Summary should mention "未評価"
    expect(report.summary).toContain("未評価");

    // Manual items should still be present
    const manualItems = report.checklist.items.filter(
      (i) => i.status === "manual",
    );
    expect(manualItems.length).toBeGreaterThan(0);
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

    // Should have start (0), per-tool (1-5), and completion (6) = 7 calls
    expect(sendProgress).toHaveBeenCalledTimes(7);
    // First call: progress 0 (start)
    expect(sendProgress.mock.calls[0][0]).toBe(0);
    expect(sendProgress.mock.calls[0][2]).toContain("監査開始");
    // Last call: completion
    expect(
      sendProgress.mock.calls[sendProgress.mock.calls.length - 1][2],
    ).toContain("チェック完了");
  });
});
