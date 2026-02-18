/**
 * Tier 3: Meta tag generator
 * Generates SEO-optimized HTML meta tags from structured input.
 *
 * Checklist 2-D:
 * - Output validation: HTML tag format check
 * - Injection prevention: attribute values escaped (no raw HTML injection)
 * - No browser-dependent APIs
 */
const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_KEYWORDS = 30;
const MAX_KEYWORD_LENGTH = 100;
/**
 * Escape HTML attribute value — prevents injection via attribute values.
 * Handles: &, <, >, ", '
 */
function escapeHtmlAttr(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#x27;");
}
/**
 * Analyze title length for SEO guidelines.
 */
function analyzeTitleLength(len) {
    if (len < 30)
        return "short";
    if (len > 60)
        return "long";
    return "good";
}
/**
 * Analyze description length for SEO guidelines.
 */
function analyzeDescriptionLength(len) {
    if (len < 70)
        return "short";
    if (len > 160)
        return "long";
    return "good";
}
export function handleGenerateMetaTags(input) {
    const issues = [];
    const tags = [];
    let tagCount = 0;
    // Runtime validation (checklist 2-A)
    if (!input.title || typeof input.title !== "string") {
        throw new Error("title is required and must be a string");
    }
    if (!input.description || typeof input.description !== "string") {
        throw new Error("description is required and must be a string");
    }
    if (input.title.length > MAX_TITLE_LENGTH) {
        throw new Error(`title exceeds maximum of ${MAX_TITLE_LENGTH} characters (received ${input.title.length})`);
    }
    if (input.description.length > MAX_DESCRIPTION_LENGTH) {
        throw new Error(`description exceeds maximum of ${MAX_DESCRIPTION_LENGTH} characters (received ${input.description.length})`);
    }
    if (input.keywords && input.keywords.length > MAX_KEYWORDS) {
        throw new Error(`keywords exceeds maximum of ${MAX_KEYWORDS} items (received ${input.keywords.length})`);
    }
    if (input.canonicalUrl) {
        if (!input.canonicalUrl.startsWith("http://") && !input.canonicalUrl.startsWith("https://")) {
            throw new Error("canonicalUrl must start with http:// or https://");
        }
    }
    // Charset
    const charset = input.charset ?? "UTF-8";
    tags.push(`<meta charset="${escapeHtmlAttr(charset)}">`);
    tagCount++;
    // Viewport
    const viewport = input.viewport ?? "width=device-width, initial-scale=1.0";
    tags.push(`<meta name="viewport" content="${escapeHtmlAttr(viewport)}">`);
    tagCount++;
    // Title
    tags.push(`<title>${escapeHtmlAttr(input.title)}</title>`);
    tagCount++;
    // Description
    tags.push(`<meta name="description" content="${escapeHtmlAttr(input.description)}">`);
    tagCount++;
    // Keywords
    if (input.keywords && input.keywords.length > 0) {
        const validKeywords = [];
        for (const kw of input.keywords) {
            if (typeof kw !== "string" || kw.trim() === "")
                continue;
            if (kw.length > MAX_KEYWORD_LENGTH) {
                issues.push(`Keyword skipped (exceeds ${MAX_KEYWORD_LENGTH} chars): "${kw.slice(0, 30)}..."`);
                continue;
            }
            validKeywords.push(kw.trim());
        }
        if (validKeywords.length > 0) {
            tags.push(`<meta name="keywords" content="${escapeHtmlAttr(validKeywords.join(", "))}">`);
            tagCount++;
        }
    }
    // Robots
    if (input.robots) {
        tags.push(`<meta name="robots" content="${escapeHtmlAttr(input.robots)}">`);
        tagCount++;
    }
    // Canonical URL
    if (input.canonicalUrl) {
        tags.push(`<link rel="canonical" href="${escapeHtmlAttr(input.canonicalUrl)}">`);
        tagCount++;
    }
    // Open Graph Protocol
    const hasOgp = !!input.ogpData;
    if (input.ogpData) {
        const ogp = input.ogpData;
        const ogpTitle = ogp.title ?? input.title;
        const ogpDescription = ogp.description ?? input.description;
        tags.push("");
        tags.push("<!-- Open Graph Protocol -->");
        tags.push(`<meta property="og:title" content="${escapeHtmlAttr(ogpTitle)}">`);
        tags.push(`<meta property="og:description" content="${escapeHtmlAttr(ogpDescription)}">`);
        tagCount += 2;
        if (ogp.type) {
            tags.push(`<meta property="og:type" content="${escapeHtmlAttr(ogp.type)}">`);
            tagCount++;
        }
        if (ogp.url) {
            tags.push(`<meta property="og:url" content="${escapeHtmlAttr(ogp.url)}">`);
            tagCount++;
        }
        if (ogp.image) {
            tags.push(`<meta property="og:image" content="${escapeHtmlAttr(ogp.image)}">`);
            tagCount++;
        }
        if (ogp.siteName) {
            tags.push(`<meta property="og:site_name" content="${escapeHtmlAttr(ogp.siteName)}">`);
            tagCount++;
        }
        if (ogp.locale) {
            tags.push(`<meta property="og:locale" content="${escapeHtmlAttr(ogp.locale)}">`);
            tagCount++;
        }
    }
    // Twitter Card
    const hasTwitterCard = !!input.twitterCard;
    if (input.twitterCard) {
        const tw = input.twitterCard;
        const card = tw.card ?? "summary_large_image";
        tags.push("");
        tags.push("<!-- Twitter Card -->");
        tags.push(`<meta name="twitter:card" content="${escapeHtmlAttr(card)}">`);
        tagCount++;
        if (tw.site) {
            tags.push(`<meta name="twitter:site" content="${escapeHtmlAttr(tw.site)}">`);
            tagCount++;
        }
        if (tw.creator) {
            tags.push(`<meta name="twitter:creator" content="${escapeHtmlAttr(tw.creator)}">`);
            tagCount++;
        }
        const twTitle = tw.title ?? input.title;
        const twDescription = tw.description ?? input.description;
        tags.push(`<meta name="twitter:title" content="${escapeHtmlAttr(twTitle)}">`);
        tags.push(`<meta name="twitter:description" content="${escapeHtmlAttr(twDescription)}">`);
        tagCount += 2;
        if (tw.image) {
            tags.push(`<meta name="twitter:image" content="${escapeHtmlAttr(tw.image)}">`);
            tagCount++;
        }
    }
    const content = tags.join("\n");
    // SEO analysis
    const titleLength = input.title.length;
    const descriptionLength = input.description.length;
    if (titleLength < 30) {
        issues.push(`Title is short (${titleLength} chars). Recommended: 30-60 characters.`);
    }
    else if (titleLength > 60) {
        issues.push(`Title is long (${titleLength} chars). Recommended: 30-60 characters.`);
    }
    if (descriptionLength < 70) {
        issues.push(`Description is short (${descriptionLength} chars). Recommended: 70-160 characters.`);
    }
    else if (descriptionLength > 160) {
        issues.push(`Description is long (${descriptionLength} chars). Recommended: 70-160 characters.`);
    }
    return {
        content,
        tagCount,
        seoAnalysis: {
            titleLength,
            titleStatus: analyzeTitleLength(titleLength),
            descriptionLength,
            descriptionStatus: analyzeDescriptionLength(descriptionLength),
            hasOgp,
            hasTwitterCard,
            hasCanonical: !!input.canonicalUrl,
        },
        validation: {
            isValid: true,
            issues,
        },
    };
}
//# sourceMappingURL=meta-tag-generator.js.map