/**
 * run_web_launch_audit — 公開前一括チェックワークフロー
 *
 * サイト公開前の品質チェックを網羅的に実行する。
 * SEO、パフォーマンス、品質、ブランディング、セキュリティの観点から検証。
 *
 * Reference: mcp-server-strategy.md Tier 2 section
 */
import { webLaunchAuditChecklist } from "./checklist-data.js";
import { runWorkflow } from "./workflow-runner.js";
export async function handleWebLaunchAudit(url, onProgress, sendProgress) {
    return runWorkflow(url, "web-launch-audit", webLaunchAuditChecklist, onProgress, sendProgress);
}
//# sourceMappingURL=web-launch-audit.js.map