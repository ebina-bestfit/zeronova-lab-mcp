import { describe, it, expect } from "vitest";
import { handleGenerateRobotsTxt } from "../tools/tier3/robots-txt-generator.js";

describe("generate_robots_txt", () => {
  // ---- Positive cases ----

  it("generates minimal robots.txt with defaults", () => {
    const result = handleGenerateRobotsTxt({});
    expect(result.content).toContain("User-agent: *");
    expect(result.validation.isValid).toBe(true);
    expect(result.lineCount).toBeGreaterThan(0);
  });

  it("generates robots.txt with sitemap URL", () => {
    const result = handleGenerateRobotsTxt({
      sitemapUrl: "https://example.com/sitemap.xml",
    });
    expect(result.content).toContain("Sitemap: https://example.com/sitemap.xml");
    expect(result.validation.isValid).toBe(true);
  });

  it("generates robots.txt with disallow and allow paths", () => {
    const result = handleGenerateRobotsTxt({
      disallowPaths: ["/admin/", "/tmp/", "/private/"],
      allowPaths: ["/admin/public/"],
    });
    expect(result.content).toContain("Disallow: /admin/");
    expect(result.content).toContain("Disallow: /tmp/");
    expect(result.content).toContain("Disallow: /private/");
    expect(result.content).toContain("Allow: /admin/public/");
    expect(result.validation.isValid).toBe(true);
  });

  it("generates robots.txt with custom user agent", () => {
    const result = handleGenerateRobotsTxt({
      userAgent: "Googlebot",
      disallowPaths: ["/secret/"],
    });
    expect(result.content).toContain("User-agent: Googlebot");
    expect(result.content).toContain("Disallow: /secret/");
  });

  it("generates robots.txt with crawl-delay", () => {
    const result = handleGenerateRobotsTxt({
      crawlDelay: 10,
    });
    expect(result.content).toContain("Crawl-delay: 10");
    expect(result.validation.isValid).toBe(true);
  });

  it("generates complete robots.txt with all options", () => {
    const result = handleGenerateRobotsTxt({
      sitemapUrl: "https://example.com/sitemap.xml",
      userAgent: "Googlebot",
      disallowPaths: ["/admin/"],
      allowPaths: ["/admin/public/"],
      crawlDelay: 5,
    });
    expect(result.content).toContain("User-agent: Googlebot");
    expect(result.content).toContain("Disallow: /admin/");
    expect(result.content).toContain("Allow: /admin/public/");
    expect(result.content).toContain("Crawl-delay: 5");
    expect(result.content).toContain("Sitemap: https://example.com/sitemap.xml");
    expect(result.validation.isValid).toBe(true);
  });

  it("sanitizes paths without leading slash", () => {
    const result = handleGenerateRobotsTxt({
      disallowPaths: ["admin/"],
    });
    expect(result.content).toContain("Disallow: /admin/");
  });

  it("removes control characters from paths", () => {
    const result = handleGenerateRobotsTxt({
      disallowPaths: ["/admin/\x00secret/"],
    });
    expect(result.content).toContain("Disallow: /admin/secret/");
    expect(result.content).not.toContain("\x00");
  });

  it("skips crawl-delay of 0", () => {
    const result = handleGenerateRobotsTxt({
      crawlDelay: 0,
    });
    expect(result.content).not.toContain("Crawl-delay:");
  });

  // ---- Negative / edge cases ----

  it("throws on more than 100 disallowPaths", () => {
    const paths = Array.from({ length: 101 }, (_, i) => `/path-${i}/`);
    expect(() => handleGenerateRobotsTxt({ disallowPaths: paths })).toThrow(
      "disallowPaths exceeds maximum of 100 items",
    );
  });

  it("throws on more than 100 allowPaths", () => {
    const paths = Array.from({ length: 101 }, (_, i) => `/allow-${i}/`);
    expect(() => handleGenerateRobotsTxt({ allowPaths: paths })).toThrow(
      "allowPaths exceeds maximum of 100 items",
    );
  });

  it("throws on sitemap URL exceeding max length", () => {
    const longUrl = "https://example.com/" + "a".repeat(2100);
    expect(() => handleGenerateRobotsTxt({ sitemapUrl: longUrl })).toThrow(
      "sitemapUrl exceeds maximum of 2048 characters",
    );
  });

  it("throws on sitemap URL without valid protocol", () => {
    expect(() => handleGenerateRobotsTxt({ sitemapUrl: "ftp://example.com/sitemap.xml" })).toThrow(
      "sitemapUrl must start with http:// or https://",
    );
  });

  it("throws on crawl-delay exceeding 60", () => {
    expect(() => handleGenerateRobotsTxt({ crawlDelay: 100 })).toThrow(
      "crawlDelay must be between 0 and 60 seconds",
    );
  });

  it("throws on negative crawl-delay", () => {
    expect(() => handleGenerateRobotsTxt({ crawlDelay: -1 })).toThrow(
      "crawlDelay must be between 0 and 60 seconds",
    );
  });

  it("skips overly long paths with issue reported", () => {
    const longPath = "/" + "a".repeat(2100);
    const result = handleGenerateRobotsTxt({
      disallowPaths: [longPath],
    });
    expect(result.content).not.toContain(longPath);
    expect(result.validation.issues.length).toBeGreaterThan(0);
    expect(result.validation.issues[0]).toContain("truncated");
  });

  // ---- Injection prevention ----

  it("sanitizes newline injection in userAgent", () => {
    const result = handleGenerateRobotsTxt({
      userAgent: "Googlebot\nDisallow: *\nUser-agent: evil",
    });
    // Newline characters should be stripped, injected text becomes part of user-agent value
    // There must be only ONE User-agent line (no injected directive on separate line)
    const userAgentLines = result.content.split("\n").filter((l) => l.startsWith("User-agent:"));
    expect(userAgentLines).toHaveLength(1);
    // The injected "Disallow:" is now part of the user-agent value, NOT a separate directive
    const disallowLines = result.content.split("\n").filter((l) => l.startsWith("Disallow:"));
    expect(disallowLines).toHaveLength(0);
    expect(result.validation.isValid).toBe(true);
  });

  it("sanitizes carriage return injection in userAgent", () => {
    const result = handleGenerateRobotsTxt({
      userAgent: "Bot\r\nDisallow: /",
    });
    // No \r characters should remain
    expect(result.content).not.toContain("\r");
    // Only one User-agent line, no injected Disallow directive
    const userAgentLines = result.content.split("\n").filter((l) => l.startsWith("User-agent:"));
    expect(userAgentLines).toHaveLength(1);
    const disallowLines = result.content.split("\n").filter((l) => l.startsWith("Disallow:"));
    expect(disallowLines).toHaveLength(0);
  });

  it("throws on sitemapUrl with control characters", () => {
    expect(() =>
      handleGenerateRobotsTxt({
        sitemapUrl: "https://example.com/sitemap.xml\nDisallow: /",
      }),
    ).toThrow("sitemapUrl must not contain control characters");
  });

  // ---- Output validation ----

  it("all lines match valid directive format", () => {
    const result = handleGenerateRobotsTxt({
      sitemapUrl: "https://example.com/sitemap.xml",
      disallowPaths: ["/admin/", "/tmp/"],
      allowPaths: ["/public/"],
      crawlDelay: 5,
    });

    const lines = result.content.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === "" || trimmed.startsWith("#")) continue;
      const isValid =
        trimmed.startsWith("User-agent:") ||
        trimmed.startsWith("Disallow:") ||
        trimmed.startsWith("Allow:") ||
        trimmed.startsWith("Sitemap:") ||
        trimmed.startsWith("Crawl-delay:");
      expect(isValid).toBe(true);
    }
  });
});
