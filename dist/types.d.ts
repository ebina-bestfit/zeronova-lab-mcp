export interface AltCheckerImage {
    src: string;
    alt: string | null;
    hasAlt: boolean;
    width: string | null;
    height: string | null;
    isDecorative: boolean;
    context: "present" | "empty" | "missing" | "decorative";
}
export interface AltCheckerResponse {
    images: AltCheckerImage[];
    title: string;
    url: string;
    summary: {
        total: number;
        withAlt: number;
        emptyAlt: number;
        missingAlt: number;
        decorative: number;
    };
}
export interface LinkCheckerLink {
    url: string;
    text: string;
    status: number;
    statusText: string;
    isExternal: boolean;
    warning?: string;
}
export interface LinkCheckerResponse {
    links: LinkCheckerLink[];
    title: string;
    checkedUrl: string;
    totalLinks: number;
}
export interface SpeedMetric {
    score: number;
    value: string;
    displayValue: string;
}
export interface ContrastViolation {
    snippet: string;
    explanation: string;
}
export interface AccessibilityResult {
    score: number | null;
    colorContrast: {
        score: number | null;
        violations: ContrastViolation[];
        violationCount: number;
    };
}
export interface SpeedCheckerResponse {
    url: string;
    strategy: "mobile" | "desktop";
    performanceScore: number;
    metrics: {
        fcp: SpeedMetric;
        lcp: SpeedMetric;
        tbt: SpeedMetric;
        cls: SpeedMetric;
        si: SpeedMetric;
        tti: SpeedMetric;
    };
    opportunities: Array<{
        title: string;
        savings: string;
    }>;
    accessibility: AccessibilityResult;
    fetchedAt: string;
}
export interface JsonLdItem {
    type: string;
    valid: boolean;
    raw: string;
}
export interface FaviconItem {
    rel: string;
    href: string;
    type: string;
    sizes: string;
}
export interface FaviconResult {
    icons: FaviconItem[];
    hasFavicon: boolean;
    hasAppleTouchIcon: boolean;
    faviconIcoExists: boolean | null;
}
export interface OgpCheckerResponse {
    ogp: {
        title: string;
        description: string;
        image: string;
        url: string;
        type: string;
        siteName: string;
    };
    twitter: {
        card: string;
        title: string;
        description: string;
        image: string;
    };
    canonical: string;
    jsonLd: JsonLdItem[];
    favicon: FaviconResult;
    rawUrl: string;
}
export interface SiteConfigRobotsResult {
    exists: boolean;
    content: string | null;
    hasSitemapDirective: boolean;
    sitemapUrls: string[];
    rules: number;
    issues: string[];
}
export interface SiteConfigSitemapResult {
    exists: boolean;
    url: string | null;
    urlCount: number;
    isIndex: boolean;
    issues: string[];
}
export interface SiteConfigCheckerResponse {
    robots: SiteConfigRobotsResult;
    sitemap: SiteConfigSitemapResult;
    domain: string;
    checkedUrl: string;
}
export interface HeadingExtractorHeading {
    level: number;
    text: string;
}
export interface HeadingExtractorResponse {
    headings: HeadingExtractorHeading[];
    title: string;
    url: string;
}
export interface SecurityHeaderCheck {
    name: string;
    present: boolean;
    value: string | null;
    status: "pass" | "warn" | "fail";
    detail: string;
}
export interface SecurityHeadersCheckerResponse {
    headers: SecurityHeaderCheck[];
    summary: {
        total: number;
        present: number;
        missing: number;
        score: number;
    };
    url: string;
    checkedUrl: string;
}
export interface ApiErrorResponse {
    error: string;
}
export type CheckStatus = "pass" | "warn" | "fail" | "error" | "skipped" | "manual";
export type Tier1ToolName = "ogp" | "headings" | "links" | "speed" | "alt" | "siteConfig" | "securityHeaders";
export interface CollectedToolResults {
    ogp: {
        data: OgpCheckerResponse;
    } | {
        error: string;
    } | null;
    headings: {
        data: HeadingExtractorResponse;
    } | {
        error: string;
    } | null;
    links: {
        data: LinkCheckerResponse;
    } | {
        error: string;
    } | null;
    speed: {
        data: SpeedCheckerResponse;
    } | {
        error: string;
    } | null;
    alt: {
        data: AltCheckerResponse;
    } | {
        error: string;
    } | null;
    siteConfig: {
        data: SiteConfigCheckerResponse;
    } | {
        error: string;
    } | null;
    securityHeaders: {
        data: SecurityHeadersCheckerResponse;
    } | {
        error: string;
    } | null;
}
export interface CheckItemDefinition {
    id: string;
    category: string;
    label: string;
    weight: number;
    autoVerifiable: boolean;
    tier1Tool?: Tier1ToolName;
    evaluate?: (results: CollectedToolResults) => {
        status: CheckStatus;
        detail?: string;
    };
}
export interface CheckItemResult {
    id: string;
    category: string;
    label: string;
    status: CheckStatus;
    detail?: string;
}
export interface ToolResultSummary {
    status: CheckStatus;
    details: Record<string, unknown>;
}
export interface AuditReport {
    url: string;
    auditType: string;
    score: number;
    summary: string;
    results: Record<string, ToolResultSummary>;
    checklist: {
        total: number;
        passed: number;
        warned: number;
        failed: number;
        errors: number;
        manual: number;
        items: CheckItemResult[];
    };
}
//# sourceMappingURL=types.d.ts.map