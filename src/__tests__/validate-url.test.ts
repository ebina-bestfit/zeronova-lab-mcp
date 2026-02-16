import { describe, it, expect } from "vitest";
import { validateUrl } from "../index.js";

describe("validateUrl", () => {
  // --- Normal cases ---
  it("accepts valid https URL", () => {
    expect(validateUrl("https://example.com")).toBe("https://example.com");
  });

  it("accepts valid http URL", () => {
    expect(validateUrl("http://example.com")).toBe("http://example.com");
  });

  it("accepts URL with path and query", () => {
    const url = "https://example.com/path?q=test&lang=ja";
    expect(validateUrl(url)).toBe(url);
  });

  // --- Protocol validation ---
  it("rejects ftp:// protocol", () => {
    expect(() => validateUrl("ftp://example.com")).toThrow(
      "URL must start with http:// or https://",
    );
  });

  it("rejects javascript: protocol", () => {
    expect(() => validateUrl("javascript:alert(1)")).toThrow(
      "URL must start with http:// or https://",
    );
  });

  it("rejects empty string", () => {
    expect(() => validateUrl("")).toThrow(
      "URL must start with http:// or https://",
    );
  });

  // --- Length validation ---
  it("accepts URL at exactly 2048 characters", () => {
    const url = "https://example.com/" + "a".repeat(2048 - 20);
    expect(url.length).toBe(2048);
    expect(validateUrl(url)).toBe(url);
  });

  it("rejects URL exceeding 2048 characters", () => {
    const url = "https://example.com/" + "a".repeat(2049);
    expect(() => validateUrl(url)).toThrow("2048 characters or fewer");
  });

  // --- Localhost blocking ---
  it("rejects localhost", () => {
    expect(() => validateUrl("http://localhost/path")).toThrow(
      "Access to localhost is not allowed",
    );
  });

  it("rejects localhost with port", () => {
    expect(() => validateUrl("http://localhost:3000")).toThrow(
      "Access to localhost is not allowed",
    );
  });

  it("rejects [::1] (IPv6 loopback)", () => {
    expect(() => validateUrl("http://[::1]/path")).toThrow(
      "Access to localhost is not allowed",
    );
  });

  // --- Private IP blocking ---
  it("rejects 127.0.0.1 (loopback)", () => {
    expect(() => validateUrl("http://127.0.0.1")).toThrow(
      "private/reserved IP",
    );
  });

  it("rejects 127.255.255.255 (loopback range)", () => {
    expect(() => validateUrl("http://127.255.255.255")).toThrow(
      "private/reserved IP",
    );
  });

  it("rejects 10.0.0.1 (private class A)", () => {
    expect(() => validateUrl("http://10.0.0.1")).toThrow(
      "private/reserved IP",
    );
  });

  it("rejects 172.16.0.1 (private class B start)", () => {
    expect(() => validateUrl("http://172.16.0.1")).toThrow(
      "private/reserved IP",
    );
  });

  it("rejects 172.31.255.255 (private class B end)", () => {
    expect(() => validateUrl("http://172.31.255.255")).toThrow(
      "private/reserved IP",
    );
  });

  it("allows 172.15.0.1 (not in private range)", () => {
    expect(validateUrl("http://172.15.0.1")).toBe("http://172.15.0.1");
  });

  it("allows 172.32.0.1 (not in private range)", () => {
    expect(validateUrl("http://172.32.0.1")).toBe("http://172.32.0.1");
  });

  it("rejects 192.168.1.1 (private class C)", () => {
    expect(() => validateUrl("http://192.168.1.1")).toThrow(
      "private/reserved IP",
    );
  });

  it("rejects 169.254.169.254 (link-local / cloud metadata)", () => {
    expect(() => validateUrl("http://169.254.169.254")).toThrow(
      "private/reserved IP",
    );
  });

  it("rejects 0.0.0.0", () => {
    expect(() => validateUrl("http://0.0.0.0")).toThrow(
      "private/reserved IP",
    );
  });

  // --- Invalid URL format ---
  it("rejects malformed URL", () => {
    expect(() => validateUrl("https://")).toThrow("Invalid URL format");
  });
});
