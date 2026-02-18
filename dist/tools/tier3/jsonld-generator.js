/**
 * Tier 3: JSON-LD / Structured Data generator
 * Generates Schema.org-compliant JSON-LD from structured input.
 *
 * Checklist 2-D:
 * - Output validation: JSON parseable + @type validation
 * - Injection prevention: uses JSON.stringify (no manual string concatenation)
 * - No browser-dependent APIs
 */
const SUPPORTED_SCHEMA_TYPES = [
    "Article",
    "BlogPosting",
    "Product",
    "Organization",
    "Person",
    "LocalBusiness",
    "WebSite",
    "WebPage",
    "FAQPage",
    "BreadcrumbList",
    "SoftwareApplication",
    "Event",
    "Recipe",
    "VideoObject",
    "HowTo",
    "Course",
];
/** Required fields per Schema.org type (subset of critical required properties) */
const REQUIRED_FIELDS = {
    Article: ["headline"],
    BlogPosting: ["headline"],
    Product: ["name"],
    Organization: ["name"],
    Person: ["name"],
    LocalBusiness: ["name", "address"],
    WebSite: ["name", "url"],
    WebPage: ["name"],
    FAQPage: ["mainEntity"],
    BreadcrumbList: ["itemListElement"],
    SoftwareApplication: ["name"],
    Event: ["name", "startDate"],
    Recipe: ["name"],
    VideoObject: ["name", "uploadDate"],
    HowTo: ["name", "step"],
    Course: ["name"],
};
/**
 * Check if a schema type is supported.
 */
function isSupportedType(type) {
    return SUPPORTED_SCHEMA_TYPES.includes(type);
}
/**
 * Recursively sanitize data — remove undefined values and functions.
 */
function sanitizeData(data) {
    if (data === null || data === undefined)
        return null;
    if (typeof data === "function")
        return null;
    if (typeof data === "symbol")
        return null;
    if (typeof data === "bigint")
        return data.toString();
    if (Array.isArray(data)) {
        return data.map(sanitizeData).filter((v) => v !== null);
    }
    if (typeof data === "object") {
        const result = {};
        for (const [key, value] of Object.entries(data)) {
            const sanitized = sanitizeData(value);
            if (sanitized !== null) {
                result[key] = sanitized;
            }
        }
        return result;
    }
    return data;
}
export function handleGenerateJsonLd(input) {
    const issues = [];
    // Runtime validation (checklist 2-A)
    if (!input.schemaType || typeof input.schemaType !== "string") {
        throw new Error("schemaType is required and must be a string");
    }
    if (!input.data || typeof input.data !== "object" || Array.isArray(input.data)) {
        throw new Error("data is required and must be an object");
    }
    const schemaType = input.schemaType;
    const hasValidType = isSupportedType(schemaType);
    if (!hasValidType) {
        issues.push(`Unsupported schema type "${schemaType}". Supported types: ${SUPPORTED_SCHEMA_TYPES.join(", ")}. The JSON-LD will still be generated but may not follow Schema.org conventions.`);
    }
    // Check required fields
    const requiredFields = REQUIRED_FIELDS[schemaType] ?? [];
    const missingRequiredFields = [];
    for (const field of requiredFields) {
        if (!(field in input.data) || input.data[field] === undefined || input.data[field] === null || input.data[field] === "") {
            missingRequiredFields.push(field);
        }
    }
    if (missingRequiredFields.length > 0) {
        issues.push(`Missing required fields for ${schemaType}: ${missingRequiredFields.join(", ")}`);
    }
    // Build JSON-LD object — using JSON.stringify for safe serialization (checklist 2-D)
    const sanitizedData = sanitizeData(input.data);
    const jsonLdObject = {
        "@context": "https://schema.org",
        "@type": schemaType,
        ...sanitizedData,
    };
    let finalObject;
    if (input.includeGraph) {
        finalObject = {
            "@context": "https://schema.org",
            "@graph": [
                {
                    "@type": schemaType,
                    ...sanitizedData,
                },
            ],
        };
    }
    else {
        finalObject = jsonLdObject;
    }
    // Serialize with JSON.stringify — guarantees valid JSON, no injection possible
    const content = JSON.stringify(finalObject, null, 2);
    // Verify output is parseable (defensive check)
    let isJsonParseable = false;
    try {
        JSON.parse(content);
        isJsonParseable = true;
    }
    catch {
        issues.push("Generated JSON-LD is not valid JSON (internal error)");
    }
    // Generate script tag for HTML embedding
    // Escape </script> in content to prevent XSS
    const safeContent = content.replace(/<\/script>/gi, "<\\/script>");
    const scriptTag = `<script type="application/ld+json">\n${safeContent}\n</script>`;
    return {
        content,
        scriptTag,
        schemaType,
        validation: {
            isValid: isJsonParseable && missingRequiredFields.length === 0,
            isJsonParseable,
            hasValidType,
            missingRequiredFields,
            issues,
        },
    };
}
//# sourceMappingURL=jsonld-generator.js.map