/**
 * Tier 3: Meta tag generator
 * Generates SEO-optimized HTML meta tags from structured input.
 *
 * Checklist 2-D:
 * - Output validation: HTML tag format check
 * - Injection prevention: attribute values escaped (no raw HTML injection)
 * - No browser-dependent APIs
 */
export interface OgpData {
    title?: string;
    description?: string;
    image?: string;
    url?: string;
    type?: string;
    siteName?: string;
    locale?: string;
}
export interface TwitterCardData {
    card?: string;
    site?: string;
    creator?: string;
    title?: string;
    description?: string;
    image?: string;
}
export interface MetaTagInput {
    title: string;
    description: string;
    keywords?: string[];
    ogpData?: OgpData;
    twitterCard?: TwitterCardData;
    canonicalUrl?: string;
    charset?: string;
    viewport?: string;
    robots?: string;
}
export interface MetaTagResult {
    content: string;
    tagCount: number;
    seoAnalysis: {
        titleLength: number;
        titleStatus: "good" | "short" | "long";
        descriptionLength: number;
        descriptionStatus: "good" | "short" | "long";
        hasOgp: boolean;
        hasTwitterCard: boolean;
        hasCanonical: boolean;
    };
    validation: {
        isValid: boolean;
        issues: string[];
    };
}
export declare function handleGenerateMetaTags(input: MetaTagInput): MetaTagResult;
//# sourceMappingURL=meta-tag-generator.d.ts.map