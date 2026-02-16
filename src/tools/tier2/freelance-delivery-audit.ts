/**
 * run_freelance_delivery_audit — 納品前一括チェックワークフロー
 *
 * フリーランスの納品前レビューを体系的に実行する。
 * リンク、パフォーマンス、SEO設定、alt属性を自動検証し、
 * コントラスト・校正・請求書等の手動確認項目もリストアップ。
 *
 * Reference: mcp-server-strategy.md Tier 2 section
 */
import { freelanceDeliveryAuditChecklist } from "./checklist-data.js";
import { runWorkflow } from "./workflow-runner.js";
import type { AuditReport } from "../../types.js";

export async function handleFreelanceDeliveryAudit(
  url: string,
  onProgress?: (message: string) => void,
  sendProgress?: (progress: number, total: number, message: string) => Promise<void>,
): Promise<AuditReport> {
  return runWorkflow(
    url,
    "freelance-delivery-audit",
    freelanceDeliveryAuditChecklist,
    onProgress,
    sendProgress,
  );
}
