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
import type { AuditReport } from "../../types.js";

export async function handleWebLaunchAudit(
  url: string,
  onProgress?: (message: string) => void,
  sendProgress?: (progress: number, total: number, message: string) => Promise<void>,
): Promise<AuditReport> {
  return runWorkflow(
    url,
    "web-launch-audit",
    webLaunchAuditChecklist,
    onProgress,
    sendProgress,
  );
}
