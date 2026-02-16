interface RateLimitConfig {
    maxRequests: number;
    windowMs: number;
}
export declare class RateLimiter {
    private windows;
    private config;
    constructor(config?: Partial<RateLimitConfig>);
    /**
     * Check if a request to the given tool is allowed.
     * Returns true if allowed, false if rate limited.
     */
    check(toolName: string): boolean;
    /**
     * Get remaining requests for a tool in the current window.
     */
    remaining(toolName: string): number;
}
export {};
//# sourceMappingURL=rate-limiter.d.ts.map