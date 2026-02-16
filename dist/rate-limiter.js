const DEFAULT_MAX_REQUESTS = 10;
const DEFAULT_WINDOW_MS = 60_000;
export class RateLimiter {
    windows = new Map();
    config;
    constructor(config) {
        this.config = {
            maxRequests: config?.maxRequests ?? DEFAULT_MAX_REQUESTS,
            windowMs: config?.windowMs ?? DEFAULT_WINDOW_MS,
        };
    }
    /**
     * Check if a request to the given tool is allowed.
     * Returns true if allowed, false if rate limited.
     */
    check(toolName) {
        const now = Date.now();
        const windowStart = now - this.config.windowMs;
        const timestamps = this.windows.get(toolName) ?? [];
        const recent = timestamps.filter((t) => t > windowStart);
        if (recent.length >= this.config.maxRequests) {
            this.windows.set(toolName, recent);
            return false;
        }
        recent.push(now);
        this.windows.set(toolName, recent);
        return true;
    }
    /**
     * Get remaining requests for a tool in the current window.
     */
    remaining(toolName) {
        const now = Date.now();
        const windowStart = now - this.config.windowMs;
        const timestamps = this.windows.get(toolName) ?? [];
        const recent = timestamps.filter((t) => t > windowStart);
        return Math.max(0, this.config.maxRequests - recent.length);
    }
}
//# sourceMappingURL=rate-limiter.js.map