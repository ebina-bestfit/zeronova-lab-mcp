import { describe, it, expect, vi, beforeEach } from "vitest";
import type { OgpCheckerResponse } from "../types.js";

const mockCheckOgp = vi.fn<(url: string) => Promise<OgpCheckerResponse>>();

vi.mock("../client.js", () => ({
  checkOgp: (...args: unknown[]) => mockCheckOgp(args[0] as string),
}));

const { handleXCardPreview } = await import(
  "../tools/tier1/x-card-preview.js"
);

describe("handleXCardPreview", () => {
  beforeEach(() => {
    mockCheckOgp.mockReset();
  });

  it("returns valid when all twitter tags are present", async () => {
    mockCheckOgp.mockResolvedValue({
      ogp: {
        title: "OG Title",
        description: "OG Desc",
        image: "https://example.com/og.png",
        url: "https://example.com",
        type: "website",
        siteName: "Example",
      },
      twitter: {
        card: "summary_large_image",
        title: "Twitter Title",
        description: "Twitter Desc",
        image: "https://example.com/twitter.png",
      },
      rawUrl: "https://example.com",
    });

    const result = await handleXCardPreview("https://example.com");

    expect(result.validation.isValid).toBe(true);
    expect(result.validation.issues).toHaveLength(0);
    expect(result.card.type).toBe("summary_large_image");
    expect(result.card.title).toBe("Twitter Title");
  });

  it("reports issues when twitter tags are missing", async () => {
    mockCheckOgp.mockResolvedValue({
      ogp: {
        title: "",
        description: "",
        image: "",
        url: "https://example.com",
        type: "",
        siteName: "",
      },
      twitter: {
        card: "",
        title: "",
        description: "",
        image: "",
      },
      rawUrl: "https://example.com",
    });

    const result = await handleXCardPreview("https://example.com");

    expect(result.validation.isValid).toBe(false);
    expect(result.validation.issues.length).toBeGreaterThan(0);
    expect(result.validation.hasCard).toBe(false);
  });

  it("falls back to OGP when twitter tags are missing", async () => {
    mockCheckOgp.mockResolvedValue({
      ogp: {
        title: "OG Title",
        description: "OG Desc",
        image: "https://example.com/og.png",
        url: "https://example.com",
        type: "website",
        siteName: "Example",
      },
      twitter: {
        card: "summary",
        title: "",
        description: "",
        image: "",
      },
      rawUrl: "https://example.com",
    });

    const result = await handleXCardPreview("https://example.com");

    expect(result.card.title).toBe("OG Title");
    expect(result.card.description).toBe("OG Desc");
    expect(result.card.image).toBe("https://example.com/og.png");
    expect(result.validation.hasTitle).toBe(true);
  });
});
