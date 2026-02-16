/**
 * Checklist data definitions for Tier 2 workflow tools.
 *
 * Each checklist item includes:
 * - Metadata (id, category, label, weight)
 * - Whether it can be auto-verified via Tier 1 tools
 * - An evaluation function that derives pass/fail from collected tool results
 *
 * Reference: mcp-dev-checklist.md section 2-C (scoring logic, weight, passCondition)
 */
import type { CheckItemDefinition } from "../../types.js";
export declare const seoAuditChecklist: CheckItemDefinition[];
export declare const webLaunchAuditChecklist: CheckItemDefinition[];
export declare const freelanceDeliveryAuditChecklist: CheckItemDefinition[];
//# sourceMappingURL=checklist-data.d.ts.map