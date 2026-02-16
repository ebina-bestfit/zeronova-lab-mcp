import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RateLimiter } from "../rate-limiter.js";

describe("RateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests within the limit", () => {
    const limiter = new RateLimiter({ maxRequests: 3, windowMs: 60_000 });
    expect(limiter.check("tool_a")).toBe(true);
    expect(limiter.check("tool_a")).toBe(true);
    expect(limiter.check("tool_a")).toBe(true);
  });

  it("blocks requests exceeding the limit", () => {
    const limiter = new RateLimiter({ maxRequests: 2, windowMs: 60_000 });
    expect(limiter.check("tool_a")).toBe(true);
    expect(limiter.check("tool_a")).toBe(true);
    expect(limiter.check("tool_a")).toBe(false);
  });

  it("resets after the window expires", () => {
    const limiter = new RateLimiter({ maxRequests: 1, windowMs: 60_000 });
    expect(limiter.check("tool_a")).toBe(true);
    expect(limiter.check("tool_a")).toBe(false);

    vi.advanceTimersByTime(60_001);

    expect(limiter.check("tool_a")).toBe(true);
  });

  it("tracks different tools independently", () => {
    const limiter = new RateLimiter({ maxRequests: 1, windowMs: 60_000 });
    expect(limiter.check("tool_a")).toBe(true);
    expect(limiter.check("tool_b")).toBe(true);
    expect(limiter.check("tool_a")).toBe(false);
    expect(limiter.check("tool_b")).toBe(false);
  });

  it("reports remaining requests correctly", () => {
    const limiter = new RateLimiter({ maxRequests: 3, windowMs: 60_000 });
    expect(limiter.remaining("tool_a")).toBe(3);
    limiter.check("tool_a");
    expect(limiter.remaining("tool_a")).toBe(2);
    limiter.check("tool_a");
    expect(limiter.remaining("tool_a")).toBe(1);
    limiter.check("tool_a");
    expect(limiter.remaining("tool_a")).toBe(0);
  });

  it("uses default config when none provided", () => {
    const limiter = new RateLimiter();
    for (let i = 0; i < 10; i++) {
      expect(limiter.check("tool_a")).toBe(true);
    }
    expect(limiter.check("tool_a")).toBe(false);
  });
});
