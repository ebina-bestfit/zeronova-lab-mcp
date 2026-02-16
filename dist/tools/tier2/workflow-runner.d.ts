import type { CheckItemDefinition, AuditReport } from "../../types.js";
/**
 * Run a Tier 2 workflow audit.
 *
 * 1. Determine required Tier 1 tools from checklist items
 * 2. Execute tools sequentially with progress notifications
 * 3. Evaluate each checklist item against collected results
 * 4. Calculate score and build summary
 * 5. Return structured AuditReport
 */
export declare function runWorkflow(url: string, auditType: string, checkItems: CheckItemDefinition[], onProgress?: (message: string) => void, sendProgress?: (progress: number, total: number, message: string) => Promise<void>): Promise<AuditReport>;
//# sourceMappingURL=workflow-runner.d.ts.map