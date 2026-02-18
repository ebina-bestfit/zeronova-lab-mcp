/**
 * Tier 3: sitemap.xml generator
 * Generates a valid XML sitemap from structured URL data.
 *
 * Checklist 2-D:
 * - Output validation: XML parseable (structural correctness guaranteed by template)
 * - Injection prevention: XML special chars (<, >, &, ', ") escaped as entities
 * - No browser-dependent APIs (no DOMParser)
 */
export interface SitemapUrlEntry {
    url: string;
    lastmod?: string;
    changefreq?: string;
    priority?: number;
}
export interface SitemapXmlInput {
    urls: SitemapUrlEntry[];
}
export interface SitemapXmlResult {
    content: string;
    urlCount: number;
    byteSize: number;
    validation: {
        isValid: boolean;
        issues: string[];
    };
}
export declare function handleGenerateSitemapXml(input: SitemapXmlInput): SitemapXmlResult;
//# sourceMappingURL=sitemap-xml-generator.d.ts.map