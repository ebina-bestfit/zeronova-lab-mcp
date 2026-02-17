/**
 * run_seo_audit — SEO一括監査ワークフロー
 *
 * Tier 1 ツール6つ（ogp, headings, links, speed, alt, siteConfig）を内部で連鎖実行し、
 * SEO設定の統合レポートをスコア付きで返却する。
 *
 * Reference: mcp-server-strategy.md Tier 2 section
 */
import { seoAuditChecklist } from "./checklist-data.js";
import { runWorkflow } from "./workflow-runner.js";
import type { AuditReport } from "../../types.js";

export async function handleSeoAudit(
  url: string,
  onProgress?: (message: string) => void,
  sendProgress?: (progress: number, total: number, message: string) => Promise<void>,
): Promise<AuditReport> {
  return runWorkflow(url, "seo-audit", seoAuditChecklist, onProgress, sendProgress);
}
