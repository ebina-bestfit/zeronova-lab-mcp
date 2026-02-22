import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  CacheCheckerResponse,
  SchemaCheckerResponse,
  RedirectCheckerResponse,
  ImageCheckerResponse,
} from "../types.js";

// ---- Mock client functions ----

const mockCheckCacheHeaders =
  vi.fn<(url: string) => Promise<CacheCheckerResponse>>();
const mockCheckSchemaCompleteness =
  vi.fn<(url: string) => Promise<SchemaCheckerResponse>>();
const mockCheckRedirectChain =
  vi.fn<(url: string) => Promise<RedirectCheckerResponse>>();
const mockCheckImageOptimization =
  vi.fn<(url: string) => Promise<ImageCheckerResponse>>();

vi.mock("../client.js", () => ({
  checkCacheHeaders: (...args: unknown[]) =>
    mockCheckCacheHeaders(args[0] as string),
  checkSchemaCompleteness: (...args: unknown[]) =>
    mockCheckSchemaCompleteness(args[0] as string),
  checkRedirectChain: (...args: unknown[]) =>
    mockCheckRedirectChain(args[0] as string),
  checkImageOptimization: (...args: unknown[]) =>
    mockCheckImageOptimization(args[0] as string),
}));

const { handleCacheChecker } = await import(
  "../tools/tier1/cache-checker.js"
);
const { handleSchemaChecker } = await import(
  "../tools/tier1/schema-checker.js"
);
const { handleRedirectChecker } = await import(
  "../tools/tier1/redirect-checker.js"
);
const { handleImageChecker } = await import(
  "../tools/tier1/image-checker.js"
);

// ---- Cache Checker ----

describe("handleCacheChecker", () => {
  beforeEach(() => {
    mockCheckCacheHeaders.mockReset();
  });

  it("returns cache header data from the API", async () => {
    const mockResponse: CacheCheckerResponse = {
      headers: [
        {
          name: "Cache-Control",
          present: true,
          value: "public, max-age=3600",
          status: "pass",
          detail: "適切なキャッシュ設定",
          category: "browser",
        },
        {
          name: "ETag",
          present: true,
          value: '"abc123"',
          status: "pass",
          detail: "ETag設定済み",
          category: "validation",
        },
      ],
      summary: {
        total: 7,
        present: 5,
        missing: 2,
        score: 80,
        browserCache: "enabled",
        cdnCache: "hit",
      },
      url: "https://example.com",
      checkedUrl: "https://example.com",
    };
    mockCheckCacheHeaders.mockResolvedValue(mockResponse);

    const result = await handleCacheChecker("https://example.com");

    expect(result.summary.score).toBe(80);
    expect(result.summary.browserCache).toBe("enabled");
    expect(result.headers).toHaveLength(2);
    expect(result.headers[0].name).toBe("Cache-Control");
    expect(result.headers[0].category).toBe("browser");
  });

  it("propagates errors from the client", async () => {
    mockCheckCacheHeaders.mockRejectedValue(new Error("Network error"));

    await expect(
      handleCacheChecker("https://example.com"),
    ).rejects.toThrow("Network error");
  });
});

// ---- Schema Checker ----

describe("handleSchemaChecker", () => {
  beforeEach(() => {
    mockCheckSchemaCompleteness.mockReset();
  });

  it("returns schema completeness data", async () => {
    const mockResponse: SchemaCheckerResponse = {
      schemas: [
        {
          type: "Article",
          source: "json-ld",
          properties: [
            { name: "headline", present: true, value: "Test", required: true },
            { name: "author", present: true, required: true },
            { name: "datePublished", present: false, required: true },
            { name: "image", present: false, required: false },
          ],
          status: "warn",
          issues: ["Missing recommended property: image"],
          raw: '{"@type":"Article","headline":"Test","author":"Author"}',
        },
      ],
      summary: {
        totalSchemas: 1,
        passCount: 0,
        warnCount: 1,
        failCount: 0,
        score: 75,
        types: ["Article"],
      },
      checkedUrl: "https://example.com",
    };
    mockCheckSchemaCompleteness.mockResolvedValue(mockResponse);

    const result = await handleSchemaChecker("https://example.com");

    expect(result.summary.totalSchemas).toBe(1);
    expect(result.schemas[0].type).toBe("Article");
    expect(result.schemas[0].status).toBe("warn");
    expect(result.summary.types).toEqual(["Article"]);
  });

  it("handles pages with no schemas", async () => {
    const mockResponse: SchemaCheckerResponse = {
      schemas: [],
      summary: {
        totalSchemas: 0,
        passCount: 0,
        warnCount: 0,
        failCount: 0,
        score: 0,
        types: [],
      },
      checkedUrl: "https://example.com",
    };
    mockCheckSchemaCompleteness.mockResolvedValue(mockResponse);

    const result = await handleSchemaChecker("https://example.com");
    expect(result.summary.totalSchemas).toBe(0);
  });
});

// ---- Redirect Checker ----

describe("handleRedirectChecker", () => {
  beforeEach(() => {
    mockCheckRedirectChain.mockReset();
  });

  it("returns redirect chain data with no redirects", async () => {
    const mockResponse: RedirectCheckerResponse = {
      hops: [
        {
          url: "https://example.com",
          statusCode: 200,
          statusText: "OK",
          location: null,
          server: "nginx",
        },
      ],
      summary: {
        totalHops: 0,
        finalUrl: "https://example.com",
        finalStatus: 200,
        hasLoop: false,
        hasHttpDowngrade: false,
        chainStatus: "pass",
      },
      checkedUrl: "https://example.com",
    };
    mockCheckRedirectChain.mockResolvedValue(mockResponse);

    const result = await handleRedirectChecker("https://example.com");

    expect(result.summary.totalHops).toBe(0);
    expect(result.summary.chainStatus).toBe("pass");
    expect(result.summary.hasLoop).toBe(false);
  });

  it("detects redirect chains", async () => {
    const mockResponse: RedirectCheckerResponse = {
      hops: [
        {
          url: "http://example.com",
          statusCode: 301,
          statusText: "Moved Permanently",
          location: "https://example.com",
          server: "nginx",
        },
        {
          url: "https://example.com",
          statusCode: 301,
          statusText: "Moved Permanently",
          location: "https://www.example.com",
          server: "nginx",
        },
        {
          url: "https://www.example.com",
          statusCode: 200,
          statusText: "OK",
          location: null,
          server: "nginx",
        },
      ],
      summary: {
        totalHops: 2,
        finalUrl: "https://www.example.com",
        finalStatus: 200,
        hasLoop: false,
        hasHttpDowngrade: false,
        chainStatus: "warn",
      },
      checkedUrl: "http://example.com",
    };
    mockCheckRedirectChain.mockResolvedValue(mockResponse);

    const result = await handleRedirectChecker("http://example.com");

    expect(result.summary.totalHops).toBe(2);
    expect(result.summary.chainStatus).toBe("warn");
    expect(result.hops).toHaveLength(3);
  });

  it("detects loops", async () => {
    const mockResponse: RedirectCheckerResponse = {
      hops: [
        {
          url: "https://a.com",
          statusCode: 301,
          statusText: "Moved Permanently",
          location: "https://b.com",
          server: null,
        },
        {
          url: "https://b.com",
          statusCode: 301,
          statusText: "Moved Permanently",
          location: "https://a.com",
          server: null,
        },
      ],
      summary: {
        totalHops: 2,
        finalUrl: "https://a.com",
        finalStatus: 301,
        hasLoop: true,
        hasHttpDowngrade: false,
        chainStatus: "fail",
      },
      checkedUrl: "https://a.com",
    };
    mockCheckRedirectChain.mockResolvedValue(mockResponse);

    const result = await handleRedirectChecker("https://a.com");
    expect(result.summary.hasLoop).toBe(true);
    expect(result.summary.chainStatus).toBe("fail");
  });
});

// ---- Image Checker ----

describe("handleImageChecker", () => {
  beforeEach(() => {
    mockCheckImageOptimization.mockReset();
  });

  it("returns image optimization data", async () => {
    const mockResponse: ImageCheckerResponse = {
      images: [
        {
          src: "https://example.com/hero.webp",
          alt: "Hero image",
          hasWidth: true,
          hasHeight: true,
          hasLazy: false,
          format: "webp",
          fileSize: 50000,
          status: "pass",
          issues: [],
        },
        {
          src: "https://example.com/photo.png",
          alt: null,
          hasWidth: false,
          hasHeight: false,
          hasLazy: false,
          format: "png",
          fileSize: 800000,
          status: "fail",
          issues: ["非次世代フォーマット（png）", "ファイルサイズが大きい（781KB）", "width/height未設定"],
        },
      ],
      summary: {
        totalImages: 2,
        totalOnPage: 5,
        passCount: 1,
        warnCount: 0,
        failCount: 1,
        score: 50,
        nextGenRate: 0.5,
        lazyRate: 0,
        dimensionRate: 0.5,
      },
      checkedUrl: "https://example.com",
    };
    mockCheckImageOptimization.mockResolvedValue(mockResponse);

    const result = await handleImageChecker("https://example.com");

    expect(result.summary.totalImages).toBe(2);
    expect(result.summary.score).toBe(50);
    expect(result.summary.nextGenRate).toBe(0.5);
    expect(result.images[0].format).toBe("webp");
    expect(result.images[1].status).toBe("fail");
    expect(result.images[1].issues).toContain("非次世代フォーマット（png）");
  });

  it("handles pages with no images", async () => {
    const mockResponse: ImageCheckerResponse = {
      images: [],
      summary: {
        totalImages: 0,
        totalOnPage: 0,
        passCount: 0,
        warnCount: 0,
        failCount: 0,
        score: 100,
        nextGenRate: 0,
        lazyRate: 0,
        dimensionRate: 0,
      },
      checkedUrl: "https://example.com",
    };
    mockCheckImageOptimization.mockResolvedValue(mockResponse);

    const result = await handleImageChecker("https://example.com");
    expect(result.summary.totalImages).toBe(0);
    expect(result.summary.score).toBe(100);
  });
});
