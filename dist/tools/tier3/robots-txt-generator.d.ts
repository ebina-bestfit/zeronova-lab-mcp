/**
 * Tier 3: robots.txt generator
 * Generates a valid robots.txt file from structured input.
 *
 * Checklist 2-D:
 * - Output validation: line format check (User-agent:, Disallow:, Allow:, Sitemap: only)
 * - Injection prevention: no raw user input embedded without validation
 * - No browser-dependent APIs
 */
export interface RobotsTxtInput {
    sitemapUrl?: string;
    disallowPaths?: string[];
    allowPaths?: string[];
    userAgent?: string;
    crawlDelay?: number;
}
export interface RobotsTxtResult {
    content: string;
    lineCount: number;
    validation: {
        isValid: boolean;
        issues: string[];
    };
}
export declare function handleGenerateRobotsTxt(input: RobotsTxtInput): RobotsTxtResult;
//# sourceMappingURL=robots-txt-generator.d.ts.map