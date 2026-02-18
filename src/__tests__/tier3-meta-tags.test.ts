import { describe, it, expect } from "vitest";
import { handleGenerateMetaTags } from "../tools/tier3/meta-tag-generator.js";

describe("generate_meta_tags", () => {
  // ---- Positive cases ----

  it("generates basic meta tags with title and description", () => {
    const result = handleGenerateMetaTags({
      title: "My Page Title for SEO Optimization",
      description: "A comprehensive meta description that provides context about the page content for search engines and users.",
    });
    expect(result.content).toContain('<meta charset="UTF-8">');
    expect(result.content).toContain('<meta name="viewport"');
    expect(result.content).toContain("<title>My Page Title for SEO Optimization</title>");
    expect(result.content).toContain('<meta name="description"');
    expect(result.tagCount).toBeGreaterThanOrEqual(4);
    expect(result.validation.isValid).toBe(true);
  });

  it("generates meta tags with keywords", () => {
    const result = handleGenerateMetaTags({
      title: "My Page Title for Testing Keywords Feature",
      description: "A comprehensive meta description for testing keyword generation in meta tags.",
      keywords: ["seo", "web development", "tools"],
    });
    expect(result.content).toContain('<meta name="keywords" content="seo, web development, tools">');
    expect(result.tagCount).toBeGreaterThanOrEqual(5);
  });

  it("generates meta tags with OGP data", () => {
    const result = handleGenerateMetaTags({
      title: "My Page Title with Open Graph Protocol",
      description: "A meta description with OGP support for social media sharing optimization.",
      ogpData: {
        image: "https://example.com/og.png",
        type: "website",
        siteName: "My Site",
        url: "https://example.com/page",
        locale: "ja_JP",
      },
    });
    expect(result.content).toContain("<!-- Open Graph Protocol -->");
    expect(result.content).toContain('<meta property="og:title"');
    expect(result.content).toContain('<meta property="og:description"');
    expect(result.content).toContain('<meta property="og:image" content="https://example.com/og.png">');
    expect(result.content).toContain('<meta property="og:type" content="website">');
    expect(result.content).toContain('<meta property="og:site_name" content="My Site">');
    expect(result.content).toContain('<meta property="og:locale" content="ja_JP">');
    expect(result.seoAnalysis.hasOgp).toBe(true);
  });

  it("generates meta tags with Twitter Card data", () => {
    const result = handleGenerateMetaTags({
      title: "My Page Title with Twitter Card Metadata",
      description: "A meta description with Twitter Card support for enhanced social media previews.",
      twitterCard: {
        card: "summary_large_image",
        site: "@zeronova",
        creator: "@zeronova",
        image: "https://example.com/tw.png",
      },
    });
    expect(result.content).toContain("<!-- Twitter Card -->");
    expect(result.content).toContain('<meta name="twitter:card" content="summary_large_image">');
    expect(result.content).toContain('<meta name="twitter:site" content="@zeronova">');
    expect(result.content).toContain('<meta name="twitter:creator" content="@zeronova">');
    expect(result.content).toContain('<meta name="twitter:image" content="https://example.com/tw.png">');
    expect(result.seoAnalysis.hasTwitterCard).toBe(true);
  });

  it("generates canonical URL", () => {
    const result = handleGenerateMetaTags({
      title: "My Page Title with Canonical URL Specification",
      description: "A meta description for testing canonical URL generation in meta tags.",
      canonicalUrl: "https://example.com/canonical-page",
    });
    expect(result.content).toContain('<link rel="canonical" href="https://example.com/canonical-page">');
    expect(result.seoAnalysis.hasCanonical).toBe(true);
  });

  it("generates robots meta tag", () => {
    const result = handleGenerateMetaTags({
      title: "My Page Title with Robots Meta Tag Setup",
      description: "A meta description for testing robots directive generation in meta tags.",
      robots: "noindex, nofollow",
    });
    expect(result.content).toContain('<meta name="robots" content="noindex, nofollow">');
  });

  it("uses page title/description as OGP fallback", () => {
    const result = handleGenerateMetaTags({
      title: "My Fallback Title for OGP Testing Setup",
      description: "A meta description that serves as OGP fallback when no OGP-specific data is provided.",
      ogpData: {
        image: "https://example.com/og.png",
      },
    });
    expect(result.content).toContain('<meta property="og:title" content="My Fallback Title for OGP Testing Setup">');
  });

  it("uses custom OGP title when provided", () => {
    const result = handleGenerateMetaTags({
      title: "Page Title for Testing Custom OGP Title",
      description: "A meta description for testing custom OGP title override functionality.",
      ogpData: {
        title: "Custom OGP Title Override Text for Test",
      },
    });
    expect(result.content).toContain('<meta property="og:title" content="Custom OGP Title Override Text for Test">');
  });

  it("generates complete meta tags with all options", () => {
    const result = handleGenerateMetaTags({
      title: "Complete Page Title with All Meta Tag Options",
      description: "A comprehensive description that tests all meta tag generation features including OGP and Twitter.",
      keywords: ["test", "meta"],
      ogpData: {
        image: "https://example.com/og.png",
        type: "article",
      },
      twitterCard: {
        card: "summary_large_image",
      },
      canonicalUrl: "https://example.com/page",
      robots: "index, follow",
      charset: "UTF-8",
      viewport: "width=device-width, initial-scale=1.0",
    });
    expect(result.seoAnalysis.hasOgp).toBe(true);
    expect(result.seoAnalysis.hasTwitterCard).toBe(true);
    expect(result.seoAnalysis.hasCanonical).toBe(true);
    expect(result.validation.isValid).toBe(true);
  });

  // ---- SEO analysis ----

  it("reports good title length (30-60 chars)", () => {
    const result = handleGenerateMetaTags({
      title: "Perfect Title Length for SEO Optimization", // 41 chars
      description: "A description that is the perfect length for search engine optimization results display.",
    });
    expect(result.seoAnalysis.titleStatus).toBe("good");
    expect(result.seoAnalysis.titleLength).toBe(41);
  });

  it("reports short title (< 30 chars)", () => {
    const result = handleGenerateMetaTags({
      title: "Short Title",
      description: "A description that is the perfect length for search engine optimization results display.",
    });
    expect(result.seoAnalysis.titleStatus).toBe("short");
    expect(result.validation.issues.some((i) => i.includes("short"))).toBe(true);
  });

  it("reports long title (> 60 chars)", () => {
    const result = handleGenerateMetaTags({
      title: "This is a very long title that exceeds the recommended sixty character limit for SEO",
      description: "A description that is the perfect length for search engine optimization results display.",
    });
    expect(result.seoAnalysis.titleStatus).toBe("long");
    expect(result.validation.issues.some((i) => i.includes("long"))).toBe(true);
  });

  it("reports good description length (70-160 chars)", () => {
    const result = handleGenerateMetaTags({
      title: "Good Title Length for Testing Description",
      description: "This description is the perfect length for search engine optimization. It provides enough context while staying within recommended limits.",
    });
    expect(result.seoAnalysis.descriptionStatus).toBe("good");
  });

  it("reports short description (< 70 chars)", () => {
    const result = handleGenerateMetaTags({
      title: "Good Title Length for Testing Description",
      description: "Too short description.",
    });
    expect(result.seoAnalysis.descriptionStatus).toBe("short");
  });

  it("reports long description (> 160 chars)", () => {
    const result = handleGenerateMetaTags({
      title: "Good Title Length for Testing Description",
      description: "a".repeat(180),
    });
    expect(result.seoAnalysis.descriptionStatus).toBe("long");
  });

  // ---- Injection prevention ----

  it("escapes HTML special characters in title", () => {
    const result = handleGenerateMetaTags({
      title: 'Test <script>alert("xss")</script> Title',
      description: "A normal description for testing HTML escaping in meta tag title fields.",
    });
    expect(result.content).not.toContain("<script>");
    expect(result.content).toContain("&lt;script&gt;");
  });

  it("escapes HTML special characters in description", () => {
    const result = handleGenerateMetaTags({
      title: "Normal Title for Description Escaping Test",
      description: 'Description with "quotes" & <special> characters',
    });
    expect(result.content).toContain("&quot;quotes&quot;");
    expect(result.content).toContain("&amp;");
    expect(result.content).toContain("&lt;special&gt;");
  });

  it("escapes HTML in OGP data", () => {
    const result = handleGenerateMetaTags({
      title: "Normal Title for OGP Escaping Testing Setup",
      description: "Normal description for testing OGP HTML escaping functionality in meta tags.",
      ogpData: {
        siteName: 'Site "Name" <test>',
      },
    });
    expect(result.content).toContain("Site &quot;Name&quot; &lt;test&gt;");
  });

  // ---- Negative cases ----

  it("throws on missing title", () => {
    expect(() =>
      handleGenerateMetaTags({
        title: "",
        description: "Description",
      }),
    ).toThrow("title is required");
  });

  it("throws on missing description", () => {
    expect(() =>
      handleGenerateMetaTags({
        title: "Title",
        description: "",
      }),
    ).toThrow("description is required");
  });

  it("throws on title exceeding max length", () => {
    expect(() =>
      handleGenerateMetaTags({
        title: "a".repeat(201),
        description: "Description",
      }),
    ).toThrow("title exceeds maximum of 200 characters");
  });

  it("throws on description exceeding max length", () => {
    expect(() =>
      handleGenerateMetaTags({
        title: "Title",
        description: "a".repeat(501),
      }),
    ).toThrow("description exceeds maximum of 500 characters");
  });

  it("throws on too many keywords", () => {
    const keywords = Array.from({ length: 31 }, (_, i) => `keyword-${i}`);
    expect(() =>
      handleGenerateMetaTags({
        title: "Title",
        description: "Description",
        keywords,
      }),
    ).toThrow("keywords exceeds maximum of 30 items");
  });

  it("throws on canonical URL without valid protocol", () => {
    expect(() =>
      handleGenerateMetaTags({
        title: "Title",
        description: "Description",
        canonicalUrl: "ftp://example.com",
      }),
    ).toThrow("canonicalUrl must start with http:// or https://");
  });

  it("skips overly long keywords with issue", () => {
    const result = handleGenerateMetaTags({
      title: "Normal Title for Keyword Length Testing Setup",
      description: "Normal description for testing keyword length validation in meta tag generation.",
      keywords: ["valid", "a".repeat(101)],
    });
    expect(result.content).toContain("valid");
    expect(result.validation.issues.some((i) => i.includes("Keyword skipped"))).toBe(true);
  });

  it("skips empty keywords", () => {
    const result = handleGenerateMetaTags({
      title: "Normal Title for Empty Keyword Testing",
      description: "Normal description for testing how empty keywords are handled in meta tags.",
      keywords: ["valid", "", "  "],
    });
    expect(result.content).toContain("valid");
    expect(result.content).not.toContain('content=",');
  });
});
