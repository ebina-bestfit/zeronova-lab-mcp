/**
 * Tier 3: .htaccess generator
 * Generates a valid Apache .htaccess file with redirect rules, cache control, and compression.
 *
 * Checklist 2-D:
 * - Output validation: Apache directive syntax check
 * - Injection prevention: RewriteRule pattern metacharacter validation
 * - No browser-dependent APIs
 */
export interface RedirectRule {
    from: string;
    to: string;
    statusCode?: number;
}
export interface CacheControlRule {
    extension: string;
    maxAge: number;
}
export interface HtaccessInput {
    redirectRules?: RedirectRule[];
    cacheControl?: CacheControlRule[];
    compressionEnabled?: boolean;
    forceHttps?: boolean;
    removeTrailingSlash?: boolean;
}
export interface HtaccessResult {
    content: string;
    lineCount: number;
    validation: {
        isValid: boolean;
        issues: string[];
    };
}
export declare function handleGenerateHtaccess(input: HtaccessInput): HtaccessResult;
//# sourceMappingURL=htaccess-generator.d.ts.map