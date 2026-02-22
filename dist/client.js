import { z } from "zod";
// Checklist 2-B: API base URL configurable via ZERONOVA_API_URL env var
const DEFAULT_BASE_URL = "https://zeronova-lab.com/api/tools";
const BASE_URL = process.env.ZERONOVA_API_URL
    ? `${process.env.ZERONOVA_API_URL.replace(/\/$/, "")}/api/tools`
    : DEFAULT_BASE_URL;
// Checklist 2-A: Tier 1 timeout = 15 seconds (default)
const REQUEST_TIMEOUT_MS = 15_000;
// Speed checker needs longer timeout to match the upstream API (30s)
const SPEED_CHECKER_TIMEOUT_MS = 30_000;
// Checklist 2-A: 1 retry with 2s wait on network/server error
const RETRY_DELAY_MS = 2_000;
// Checklist 2-B: User-Agent format = ZeronovaLabMCP/{version}
const USER_AGENT = "ZeronovaLabMCP/0.4.1";
export class ApiError extends Error {
    statusCode;
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
        this.name = "ApiError";
    }
}
function isRetryableError(error) {
    if (error instanceof ApiError) {
        return error.statusCode >= 500 || error.statusCode === 408;
    }
    if (error instanceof Error) {
        return (error.name === "AbortError" ||
            error.message.includes("fetch failed") ||
            error.message.includes("ECONNREFUSED") ||
            error.message.includes("ENOTFOUND") ||
            error.message.includes("ETIMEDOUT"));
    }
    return false;
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
async function fetchApiOnce(endpoint, params, timeoutMs = REQUEST_TIMEOUT_MS) {
    const url = new URL(`${BASE_URL}/${endpoint}`);
    for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url.toString(), {
            signal: controller.signal,
            headers: {
                "User-Agent": USER_AGENT,
            },
        });
        if (!response.ok) {
            const body = await response.text();
            let message;
            try {
                const json = JSON.parse(body);
                message = json.error ?? body;
            }
            catch {
                message = body;
            }
            throw new ApiError(response.status, message);
        }
        return (await response.json());
    }
    catch (error) {
        if (error instanceof ApiError)
            throw error;
        if (error instanceof Error && error.name === "AbortError") {
            throw new ApiError(408, `Request timed out after ${timeoutMs / 1000}s`);
        }
        throw new ApiError(500, error instanceof Error ? error.message : "Unknown error");
    }
    finally {
        clearTimeout(timeout);
    }
}
/**
 * Fetch API with retry logic.
 * Checklist 2-A: 1 retry with 2s wait on network/server error.
 * 2 failures total → error returned (no infinite retry).
 */
async function fetchApi(endpoint, params, timeoutMs = REQUEST_TIMEOUT_MS) {
    try {
        return await fetchApiOnce(endpoint, params, timeoutMs);
    }
    catch (error) {
        if (isRetryableError(error)) {
            await sleep(RETRY_DELAY_MS);
            return fetchApiOnce(endpoint, params, timeoutMs);
        }
        throw error;
    }
}
// ---- Zod response schemas for runtime validation (checklist 2-B) ----
const altCheckerImageSchema = z.object({
    src: z.string(),
    alt: z.union([z.string(), z.null()]),
    hasAlt: z.boolean(),
    width: z.union([z.string(), z.null()]),
    height: z.union([z.string(), z.null()]),
    isDecorative: z.boolean(),
    context: z.enum(["present", "empty", "missing", "decorative"]),
});
const altCheckerResponseSchema = z.object({
    images: z.array(altCheckerImageSchema),
    title: z.string(),
    url: z.string(),
    summary: z.object({
        total: z.number(),
        withAlt: z.number(),
        emptyAlt: z.number(),
        missingAlt: z.number(),
        decorative: z.number(),
    }),
});
const linkCheckerResponseSchema = z.object({
    links: z.array(z.object({
        url: z.string(),
        text: z.string(),
        status: z.number(),
        statusText: z.string(),
        isExternal: z.boolean(),
        warning: z.string().optional(),
    })),
    title: z.string(),
    checkedUrl: z.string(),
    totalLinks: z.number(),
});
const speedMetricSchema = z.object({
    score: z.number(),
    value: z.string(),
    displayValue: z.string(),
});
const contrastViolationSchema = z.object({
    snippet: z.string(),
    explanation: z.string(),
});
const accessibilityResultSchema = z.object({
    score: z.union([z.number(), z.null()]),
    colorContrast: z.object({
        score: z.union([z.number(), z.null()]),
        violations: z.array(contrastViolationSchema),
        violationCount: z.number(),
    }),
});
const speedCheckerResponseSchema = z.object({
    url: z.string(),
    strategy: z.enum(["mobile", "desktop"]),
    performanceScore: z.number(),
    metrics: z.object({
        fcp: speedMetricSchema,
        lcp: speedMetricSchema,
        tbt: speedMetricSchema,
        cls: speedMetricSchema,
        si: speedMetricSchema,
        tti: speedMetricSchema,
    }),
    opportunities: z.array(z.object({
        title: z.string(),
        savings: z.string(),
    })),
    accessibility: accessibilityResultSchema,
    fetchedAt: z.string(),
});
const jsonLdItemSchema = z.object({
    type: z.string(),
    valid: z.boolean(),
    raw: z.string(),
});
const faviconItemSchema = z.object({
    rel: z.string(),
    href: z.string(),
    type: z.string(),
    sizes: z.string(),
});
const faviconResultSchema = z.object({
    icons: z.array(faviconItemSchema),
    hasFavicon: z.boolean(),
    hasAppleTouchIcon: z.boolean(),
    faviconIcoExists: z.union([z.boolean(), z.null()]),
});
const ogpCheckerResponseSchema = z.object({
    ogp: z.object({
        title: z.string(),
        description: z.string(),
        image: z.string(),
        url: z.string(),
        type: z.string(),
        siteName: z.string(),
    }),
    twitter: z.object({
        card: z.string(),
        title: z.string(),
        description: z.string(),
        image: z.string(),
    }),
    canonical: z.string(),
    jsonLd: z.array(jsonLdItemSchema),
    favicon: faviconResultSchema,
    rawUrl: z.string(),
});
const siteConfigCheckerResponseSchema = z.object({
    robots: z.object({
        exists: z.boolean(),
        content: z.union([z.string(), z.null()]),
        hasSitemapDirective: z.boolean(),
        sitemapUrls: z.array(z.string()),
        rules: z.number(),
        issues: z.array(z.string()),
    }),
    sitemap: z.object({
        exists: z.boolean(),
        url: z.union([z.string(), z.null()]),
        urlCount: z.number(),
        isIndex: z.boolean(),
        issues: z.array(z.string()),
    }),
    domain: z.string(),
    checkedUrl: z.string(),
});
const headingExtractorResponseSchema = z.object({
    headings: z.array(z.object({
        level: z.number(),
        text: z.string(),
    })),
    title: z.string(),
    url: z.string(),
});
const securityHeadersCheckerResponseSchema = z.object({
    headers: z.array(z.object({
        name: z.string(),
        present: z.boolean(),
        value: z.union([z.string(), z.null()]),
        status: z.enum(["pass", "warn", "fail"]),
        detail: z.string(),
    })),
    summary: z.object({
        total: z.number(),
        present: z.number(),
        missing: z.number(),
        score: z.number(),
    }),
    url: z.string(),
    checkedUrl: z.string(),
});
/**
 * Validate API response against Zod schema.
 * Checklist 2-B: detect API response format changes early.
 */
function validateResponse(data, schema, endpoint) {
    const result = schema.safeParse(data);
    if (!result.success) {
        throw new ApiError(502, `API response format has changed for ${endpoint}. Please update the zeronova-lab-mcp package.`);
    }
    return result.data;
}
// ---- Public API functions ----
export async function checkAltAttributes(url) {
    const raw = await fetchApi("alt-checker", { url });
    return validateResponse(raw, altCheckerResponseSchema, "alt-checker");
}
export async function checkLinks(url) {
    const raw = await fetchApi("link-checker", { url });
    return validateResponse(raw, linkCheckerResponseSchema, "link-checker");
}
export async function checkSpeed(url, strategy = "mobile") {
    const raw = await fetchApi("speed-checker", { url, strategy }, SPEED_CHECKER_TIMEOUT_MS);
    return validateResponse(raw, speedCheckerResponseSchema, "speed-checker");
}
export async function checkOgp(url) {
    const raw = await fetchApi("ogp-checker", { url });
    return validateResponse(raw, ogpCheckerResponseSchema, "ogp-checker");
}
export async function extractHeadings(url) {
    const raw = await fetchApi("heading-extractor", { url });
    return validateResponse(raw, headingExtractorResponseSchema, "heading-extractor");
}
export async function checkSiteConfig(url) {
    const raw = await fetchApi("site-config-checker", { url });
    return validateResponse(raw, siteConfigCheckerResponseSchema, "site-config-checker");
}
export async function checkSecurityHeaders(url) {
    const raw = await fetchApi("security-headers-checker", { url });
    return validateResponse(raw, securityHeadersCheckerResponseSchema, "security-headers-checker");
}
//# sourceMappingURL=client.js.map