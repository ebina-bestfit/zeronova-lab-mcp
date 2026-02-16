import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ApiError } from "../client.js";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Reset modules so client.ts picks up mocked fetch
const { checkAltAttributes, checkLinks } = await import("../client.js");

describe("client - API calls", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sends ZeronovaLabMCP User-Agent header", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        images: [],
        title: "Test",
        url: "https://example.com",
        summary: {
          total: 0,
          withAlt: 0,
          emptyAlt: 0,
          missingAlt: 0,
          decorative: 0,
        },
      }),
    });

    await checkAltAttributes("https://example.com");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(options.headers).toEqual(
      expect.objectContaining({ "User-Agent": "ZeronovaLabMCP/0.2.0" }),
    );
  });

  it("retries once on 500 server error", async () => {
    // First call: 500 error
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => JSON.stringify({ error: "Internal Server Error" }),
    });
    // Retry: success
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        links: [],
        title: "Test",
        checkedUrl: "https://example.com",
        totalLinks: 0,
      }),
    });

    const result = await checkLinks("https://example.com");

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result.totalLinks).toBe(0);
  });

  it("does not retry on 400 client error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ error: "Bad Request" }),
    });

    await expect(checkLinks("https://example.com")).rejects.toThrow(ApiError);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("throws ApiError with 502 on invalid response schema", async () => {
    // Return data that doesn't match expected schema
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ unexpected: "data" }),
    });

    await expect(checkAltAttributes("https://example.com")).rejects.toThrow(
      "API response format has changed",
    );
  });
});
