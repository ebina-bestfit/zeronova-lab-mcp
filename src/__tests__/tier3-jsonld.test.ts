import { describe, it, expect } from "vitest";
import { handleGenerateJsonLd } from "../tools/tier3/jsonld-generator.js";

describe("generate_jsonld", () => {
  // ---- Positive cases ----

  it("generates valid Article JSON-LD", () => {
    const result = handleGenerateJsonLd({
      schemaType: "Article",
      data: {
        headline: "Test Article",
        author: { "@type": "Person", name: "Author" },
        datePublished: "2026-02-18",
      },
    });
    const parsed = JSON.parse(result.content);
    expect(parsed["@context"]).toBe("https://schema.org");
    expect(parsed["@type"]).toBe("Article");
    expect(parsed.headline).toBe("Test Article");
    expect(result.validation.isValid).toBe(true);
    expect(result.validation.isJsonParseable).toBe(true);
    expect(result.validation.hasValidType).toBe(true);
    expect(result.validation.missingRequiredFields).toEqual([]);
  });

  it("generates valid BlogPosting JSON-LD", () => {
    const result = handleGenerateJsonLd({
      schemaType: "BlogPosting",
      data: {
        headline: "My Blog Post",
        author: { "@type": "Person", name: "Zeronova" },
        datePublished: "2026-02-18",
        description: "A blog post description",
      },
    });
    const parsed = JSON.parse(result.content);
    expect(parsed["@type"]).toBe("BlogPosting");
    expect(result.validation.isValid).toBe(true);
  });

  it("generates valid Product JSON-LD", () => {
    const result = handleGenerateJsonLd({
      schemaType: "Product",
      data: {
        name: "Test Product",
        description: "Product description",
        offers: { "@type": "Offer", price: "9.99", priceCurrency: "USD" },
      },
    });
    const parsed = JSON.parse(result.content);
    expect(parsed["@type"]).toBe("Product");
    expect(parsed.name).toBe("Test Product");
    expect(result.validation.isValid).toBe(true);
  });

  it("generates valid Organization JSON-LD", () => {
    const result = handleGenerateJsonLd({
      schemaType: "Organization",
      data: {
        name: "ZERONOVA LAB",
        url: "https://zeronova-lab.com",
        sameAs: ["https://twitter.com/zeronova"],
      },
    });
    const parsed = JSON.parse(result.content);
    expect(parsed["@type"]).toBe("Organization");
    expect(parsed.sameAs).toEqual(["https://twitter.com/zeronova"]);
    expect(result.validation.isValid).toBe(true);
  });

  it("generates valid FAQPage JSON-LD", () => {
    const result = handleGenerateJsonLd({
      schemaType: "FAQPage",
      data: {
        mainEntity: [
          {
            "@type": "Question",
            name: "What is this?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "This is a test.",
            },
          },
        ],
      },
    });
    const parsed = JSON.parse(result.content);
    expect(parsed["@type"]).toBe("FAQPage");
    expect(parsed.mainEntity).toHaveLength(1);
    expect(result.validation.isValid).toBe(true);
  });

  it("generates valid BreadcrumbList JSON-LD", () => {
    const result = handleGenerateJsonLd({
      schemaType: "BreadcrumbList",
      data: {
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "https://example.com/" },
          { "@type": "ListItem", position: 2, name: "Blog", item: "https://example.com/blog" },
        ],
      },
    });
    const parsed = JSON.parse(result.content);
    expect(parsed["@type"]).toBe("BreadcrumbList");
    expect(parsed.itemListElement).toHaveLength(2);
    expect(result.validation.isValid).toBe(true);
  });

  it("wraps in @graph when includeGraph is true", () => {
    const result = handleGenerateJsonLd({
      schemaType: "Article",
      data: { headline: "Test" },
      includeGraph: true,
    });
    const parsed = JSON.parse(result.content);
    expect(parsed["@context"]).toBe("https://schema.org");
    expect(parsed["@graph"]).toBeDefined();
    expect(Array.isArray(parsed["@graph"])).toBe(true);
    expect(parsed["@graph"][0]["@type"]).toBe("Article");
    expect(result.validation.isValid).toBe(true);
  });

  it("generates script tag with type=application/ld+json", () => {
    const result = handleGenerateJsonLd({
      schemaType: "Article",
      data: { headline: "Test" },
    });
    expect(result.scriptTag).toContain('<script type="application/ld+json">');
    expect(result.scriptTag).toContain("</script>");
  });

  it("escapes </script> in script tag to prevent XSS", () => {
    const result = handleGenerateJsonLd({
      schemaType: "Article",
      data: {
        headline: "Test</script><script>alert(1)</script>",
      },
    });
    expect(result.scriptTag).not.toContain("</script><script>");
    expect(result.scriptTag).toContain("<\\/script>");
  });

  it("sanitizes undefined, null, and function values", () => {
    const result = handleGenerateJsonLd({
      schemaType: "Article",
      data: {
        headline: "Test",
        undefinedField: undefined,
        nullField: null,
      },
    });
    const parsed = JSON.parse(result.content);
    expect(parsed.undefinedField).toBeUndefined();
    expect(parsed.nullField).toBeUndefined(); // null sanitized to null, then filtered
  });

  it("returns schemaType in result", () => {
    const result = handleGenerateJsonLd({
      schemaType: "LocalBusiness",
      data: {
        name: "Test Biz",
        address: "123 Main St",
      },
    });
    expect(result.schemaType).toBe("LocalBusiness");
  });

  // ---- Negative / edge cases ----

  it("throws on missing schemaType", () => {
    expect(() =>
      handleGenerateJsonLd({
        schemaType: "",
        data: { headline: "Test" },
      }),
    ).toThrow("schemaType is required");
  });

  it("throws on missing data object", () => {
    expect(() =>
      handleGenerateJsonLd({
        schemaType: "Article",
        data: null as unknown as Record<string, unknown>,
      }),
    ).toThrow("data is required and must be an object");
  });

  it("throws on array as data", () => {
    expect(() =>
      handleGenerateJsonLd({
        schemaType: "Article",
        data: [] as unknown as Record<string, unknown>,
      }),
    ).toThrow("data is required and must be an object");
  });

  it("reports unsupported schema type as issue but still generates", () => {
    const result = handleGenerateJsonLd({
      schemaType: "CustomType",
      data: { name: "Test" },
    });
    expect(result.validation.hasValidType).toBe(false);
    expect(result.validation.issues.length).toBeGreaterThan(0);
    expect(result.validation.issues[0]).toContain("Unsupported schema type");
    // Still generates valid JSON
    const parsed = JSON.parse(result.content);
    expect(parsed["@type"]).toBe("CustomType");
  });

  it("reports missing required fields for Article", () => {
    const result = handleGenerateJsonLd({
      schemaType: "Article",
      data: { author: "Someone" }, // missing headline
    });
    expect(result.validation.missingRequiredFields).toContain("headline");
    expect(result.validation.isValid).toBe(false);
  });

  it("reports missing required fields for Event", () => {
    const result = handleGenerateJsonLd({
      schemaType: "Event",
      data: { name: "Conference" }, // missing startDate
    });
    expect(result.validation.missingRequiredFields).toContain("startDate");
    expect(result.validation.isValid).toBe(false);
  });

  it("reports missing required fields for LocalBusiness", () => {
    const result = handleGenerateJsonLd({
      schemaType: "LocalBusiness",
      data: { name: "Biz" }, // missing address
    });
    expect(result.validation.missingRequiredFields).toContain("address");
    expect(result.validation.isValid).toBe(false);
  });

  // ---- Output is always parseable JSON ----

  it("output is always parseable JSON regardless of input", () => {
    const result = handleGenerateJsonLd({
      schemaType: "Article",
      data: {
        headline: 'Test "with" special <chars> & entities',
      },
    });
    expect(result.validation.isJsonParseable).toBe(true);
    const parsed = JSON.parse(result.content);
    expect(parsed.headline).toBe('Test "with" special <chars> & entities');
  });

  it("supports all 16 schema types", () => {
    const types = [
      "Article", "BlogPosting", "Product", "Organization", "Person",
      "LocalBusiness", "WebSite", "WebPage", "FAQPage", "BreadcrumbList",
      "SoftwareApplication", "Event", "Recipe", "VideoObject", "HowTo", "Course",
    ];
    for (const type of types) {
      const result = handleGenerateJsonLd({
        schemaType: type,
        data: { name: "Test", headline: "Test", mainEntity: [], itemListElement: [], url: "https://example.com", startDate: "2026-01-01", uploadDate: "2026-01-01", step: [], address: "Test" },
      });
      expect(result.validation.hasValidType).toBe(true);
      expect(result.validation.isJsonParseable).toBe(true);
    }
  });
});
