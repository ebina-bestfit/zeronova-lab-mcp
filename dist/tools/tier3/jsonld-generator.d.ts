/**
 * Tier 3: JSON-LD / Structured Data generator
 * Generates Schema.org-compliant JSON-LD from structured input.
 *
 * Checklist 2-D:
 * - Output validation: JSON parseable + @type validation
 * - Injection prevention: uses JSON.stringify (no manual string concatenation)
 * - No browser-dependent APIs
 */
export interface JsonLdInput {
    schemaType: string;
    data: Record<string, unknown>;
    includeGraph?: boolean;
}
export interface JsonLdResult {
    content: string;
    scriptTag: string;
    schemaType: string;
    validation: {
        isValid: boolean;
        isJsonParseable: boolean;
        hasValidType: boolean;
        missingRequiredFields: string[];
        issues: string[];
    };
}
export declare function handleGenerateJsonLd(input: JsonLdInput): JsonLdResult;
//# sourceMappingURL=jsonld-generator.d.ts.map