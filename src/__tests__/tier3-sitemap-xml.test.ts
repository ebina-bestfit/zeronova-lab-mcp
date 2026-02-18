import { describe, it, expect } from "vitest";
import { handleGenerateSitemapXml } from "../tools/tier3/sitemap-xml-generator.js";

describe("generate_sitemap_xml", () => {
  // ---- Positive cases ----

  it("generates minimal sitemap with one URL", () => {
    const result = handleGenerateSitemapXml({
      urls: [{ url: "https://example.com/" }],
    });
    expect(result.content).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(result.content).toContain("<urlset");
    expect(result.content).toContain("<loc>https://example.com/</loc>");
    expect(result.content).toContain("</urlset>");
    expect(result.urlCount).toBe(1);
    expect(result.byteSize).toBeGreaterThan(0);
    expect(result.validation.isValid).toBe(true);
  });

  it("generates sitemap with all optional fields", () => {
    const result = handleGenerateSitemapXml({
      urls: [
        {
          url: "https://example.com/",
          lastmod: "2026-02-18",
          changefreq: "weekly",
          priority: 1.0,
        },
        {
          url: "https://example.com/about",
          lastmod: "2026-01-15",
          changefreq: "monthly",
          priority: 0.5,
        },
      ],
    });
    expect(result.content).toContain("<lastmod>2026-02-18</lastmod>");
    expect(result.content).toContain("<changefreq>weekly</changefreq>");
    expect(result.content).toContain("<priority>1.0</priority>");
    expect(result.content).toContain("<priority>0.5</priority>");
    expect(result.urlCount).toBe(2);
    expect(result.validation.isValid).toBe(true);
  });

  it("generates sitemap with W3C datetime lastmod", () => {
    const result = handleGenerateSitemapXml({
      urls: [
        {
          url: "https://example.com/",
          lastmod: "2026-02-18T10:30:00+09:00",
        },
      ],
    });
    expect(result.content).toContain("<lastmod>2026-02-18T10:30:00+09:00</lastmod>");
    expect(result.validation.isValid).toBe(true);
  });

  it("generates sitemap with UTC datetime lastmod", () => {
    const result = handleGenerateSitemapXml({
      urls: [
        {
          url: "https://example.com/",
          lastmod: "2026-02-18T01:30:00Z",
        },
      ],
    });
    expect(result.content).toContain("<lastmod>2026-02-18T01:30:00Z</lastmod>");
    expect(result.validation.isValid).toBe(true);
  });

  it("escapes XML special characters in URLs", () => {
    const result = handleGenerateSitemapXml({
      urls: [{ url: "https://example.com/page?a=1&b=2" }],
    });
    expect(result.content).toContain("<loc>https://example.com/page?a=1&amp;b=2</loc>");
    expect(result.content).not.toContain("<loc>https://example.com/page?a=1&b=2</loc>");
    expect(result.validation.isValid).toBe(true);
  });

  it("formats priority with one decimal place", () => {
    const result = handleGenerateSitemapXml({
      urls: [{ url: "https://example.com/", priority: 0.8 }],
    });
    expect(result.content).toContain("<priority>0.8</priority>");
  });

  it("handles multiple URLs correctly", () => {
    const urls = Array.from({ length: 10 }, (_, i) => ({
      url: `https://example.com/page-${i}`,
    }));
    const result = handleGenerateSitemapXml({ urls });
    expect(result.urlCount).toBe(10);
    expect(result.validation.isValid).toBe(true);
  });

  it("handles priority boundary values 0.0 and 1.0", () => {
    const result = handleGenerateSitemapXml({
      urls: [
        { url: "https://example.com/", priority: 0.0 },
        { url: "https://example.com/page", priority: 1.0 },
      ],
    });
    expect(result.content).toContain("<priority>0.0</priority>");
    expect(result.content).toContain("<priority>1.0</priority>");
    expect(result.validation.isValid).toBe(true);
  });

  // ---- Negative / edge cases ----

  it("rejects protocol-only URL (no hostname)", () => {
    const result = handleGenerateSitemapXml({
      urls: [
        { url: "https://example.com/" },
        { url: "https://" },
      ],
    });
    expect(result.urlCount).toBe(1);
    expect(result.validation.issues.length).toBeGreaterThan(0);
    expect(result.validation.issues[0]).toContain("invalid URL format");
  });

  it("rejects URL with spaces", () => {
    const result = handleGenerateSitemapXml({
      urls: [
        { url: "https://example.com/" },
        { url: "https://example.com/path with spaces" },
      ],
    });
    expect(result.urlCount).toBe(1);
    expect(result.validation.issues.length).toBeGreaterThan(0);
  });

  it("rejects URL with control characters", () => {
    const result = handleGenerateSitemapXml({
      urls: [
        { url: "https://example.com/" },
        { url: "https://example.com/path\x00" },
      ],
    });
    expect(result.urlCount).toBe(1);
    expect(result.validation.issues.length).toBeGreaterThan(0);
  });

  it("throws on empty urls array", () => {
    expect(() => handleGenerateSitemapXml({ urls: [] })).toThrow(
      "urls must contain at least one entry",
    );
  });

  it("reports issue for invalid URL format", () => {
    const result = handleGenerateSitemapXml({
      urls: [
        { url: "https://example.com/" },
        { url: "not-a-url" },
      ],
    });
    expect(result.urlCount).toBe(1);
    expect(result.validation.issues.length).toBeGreaterThan(0);
    expect(result.validation.issues[0]).toContain("invalid URL format");
  });

  it("reports issue for invalid lastmod format", () => {
    const result = handleGenerateSitemapXml({
      urls: [{ url: "https://example.com/", lastmod: "Feb 18, 2026" }],
    });
    expect(result.validation.issues.length).toBeGreaterThan(0);
    expect(result.validation.issues[0]).toContain("invalid lastmod format");
  });

  it("reports issue for invalid changefreq", () => {
    const result = handleGenerateSitemapXml({
      urls: [{ url: "https://example.com/", changefreq: "biweekly" }],
    });
    expect(result.validation.issues.length).toBeGreaterThan(0);
    expect(result.validation.issues[0]).toContain("invalid changefreq");
  });

  it("reports issue for invalid priority", () => {
    const result = handleGenerateSitemapXml({
      urls: [{ url: "https://example.com/", priority: 1.5 }],
    });
    expect(result.validation.issues.length).toBeGreaterThan(0);
    expect(result.validation.issues[0]).toContain("invalid priority");
  });

  it("reports issue for missing URL in entry", () => {
    const result = handleGenerateSitemapXml({
      urls: [
        { url: "https://example.com/" },
        { url: "" },
      ],
    });
    expect(result.urlCount).toBe(1);
    expect(result.validation.issues.length).toBeGreaterThan(0);
  });

  it("skips entries with too-long URLs", () => {
    const longUrl = "https://example.com/" + "a".repeat(2100);
    const result = handleGenerateSitemapXml({
      urls: [
        { url: "https://example.com/" },
        { url: longUrl },
      ],
    });
    expect(result.urlCount).toBe(1);
    expect(result.validation.issues.length).toBeGreaterThan(0);
  });

  // ---- Output structure validation ----

  it("produces well-formed XML structure", () => {
    const result = handleGenerateSitemapXml({
      urls: [{ url: "https://example.com/" }],
    });
    const openTags = (result.content.match(/<url>/g) ?? []).length;
    const closeTags = (result.content.match(/<\/url>/g) ?? []).length;
    expect(openTags).toBe(closeTags);
    expect(result.content.startsWith('<?xml version="1.0"'));
    expect(result.content).toContain("</urlset>");
  });

  it("calculates byte size correctly", () => {
    const result = handleGenerateSitemapXml({
      urls: [{ url: "https://example.com/" }],
    });
    const expectedBytes = new TextEncoder().encode(result.content).length;
    expect(result.byteSize).toBe(expectedBytes);
  });
});
