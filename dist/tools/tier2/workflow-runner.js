/**
 * Workflow runner for Tier 2 tools.
 *
 * Orchestrates Tier 1 tool execution, evaluates checklist items,
 * calculates scores, and returns a structured AuditReport.
 *
 * Reference: mcp-dev-checklist.md section 2-C
 * - Individual tool failure does not stop the workflow
 * - Partial results are returned with error details
 * - Workflow timeout: 60 seconds
 * - Progress via MCP SDK notifications (sendProgress) + stderr (onProgress)
 */
import { checkOgp, checkLinks, checkSpeed, extractHeadings, checkAltAttributes, } from "../../client.js";
// Checklist 2-C: Workflow timeout = 60 seconds
const WORKFLOW_TIMEOUT_MS = 60_000;
const TOOL_DISPLAY_NAMES = {
    ogp: "OGPチェック中",
    headings: "見出し構造チェック中",
    links: "リンクチェック中",
    speed: "ページ速度チェック中",
    alt: "alt属性チェック中",
};
/**
 * Execute a single Tier 1 tool and return its result.
 * Individual tool errors are caught and returned as error results.
 * Checklist 2-C: individual tool failure does not stop the workflow.
 */
async function executeTier1Tool(url, tool) {
    try {
        switch (tool) {
            case "ogp":
                return { data: await checkOgp(url) };
            case "headings":
                return { data: await extractHeadings(url) };
            case "links":
                return { data: await checkLinks(url) };
            case "speed":
                return { data: await checkSpeed(url, "mobile") };
            case "alt":
                return { data: await checkAltAttributes(url) };
        }
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return { error: message };
    }
}
/**
 * Build a ToolResultSummary from a collected tool result for the report.
 */
function buildToolResultSummary(tool, result) {
    if (!result) {
        return { status: "skipped", details: { reason: "Not required" } };
    }
    if ("error" in result) {
        return { status: "error", details: { error: result.error } };
    }
    // Build details based on tool type
    switch (tool) {
        case "ogp": {
            const d = result.data;
            const hasTitle = !!d.ogp.title;
            const hasDesc = !!d.ogp.description;
            const hasImage = !!d.ogp.image;
            const hasCard = !!d.twitter.card;
            const allGood = hasTitle && hasDesc && hasImage && hasCard;
            return {
                status: allGood ? "pass" : hasTitle ? "warn" : "fail",
                details: {
                    title: d.ogp.title
                        ? `✓ 設定済み（${d.ogp.title.length}文字）`
                        : "✗ 未設定",
                    description: d.ogp.description
                        ? `✓ 設定済み（${d.ogp.description.length}文字）`
                        : "✗ 未設定",
                    image: d.ogp.image ? "✓ 設定済み" : "✗ 未設定",
                    twitterCard: d.twitter.card
                        ? `✓ ${d.twitter.card}`
                        : "✗ 未設定",
                },
            };
        }
        case "headings": {
            const d = result.data;
            const h1Count = d.headings.filter((h) => h.level === 1).length;
            return {
                status: h1Count === 1 ? "pass" : h1Count === 0 ? "fail" : "warn",
                details: {
                    h1Count,
                    totalHeadings: d.headings.length,
                    issue: h1Count === 0
                        ? "H1タグがありません"
                        : h1Count > 1
                            ? `H1が${h1Count}個あります（推奨: 1つ）`
                            : undefined,
                },
            };
        }
        case "links": {
            const d = result.data;
            const broken = d.links.filter((l) => l.status >= 400).length;
            return {
                status: broken === 0 ? "pass" : "fail",
                details: {
                    total: d.totalLinks,
                    broken,
                },
            };
        }
        case "speed": {
            const d = result.data;
            const lcpMs = parseFloat(d.metrics.lcp.value);
            const lcpSec = lcpMs / 1000;
            const clsVal = parseFloat(d.metrics.cls.value);
            const issues = [];
            if (lcpSec > 2.5)
                issues.push(`LCP ${lcpSec.toFixed(1)}秒`);
            if (clsVal > 0.1)
                issues.push(`CLS ${clsVal.toFixed(3)}`);
            if (d.performanceScore < 50)
                issues.push(`スコア${d.performanceScore}点`);
            return {
                status: d.performanceScore >= 90 && issues.length === 0
                    ? "pass"
                    : d.performanceScore >= 50
                        ? "warn"
                        : "fail",
                details: {
                    performanceScore: d.performanceScore,
                    lcp: lcpSec,
                    cls: clsVal,
                    issue: issues.length > 0 ? issues.join(", ") : undefined,
                },
            };
        }
        case "alt": {
            const d = result.data;
            return {
                status: d.summary.total === 0 || d.summary.missingAlt === 0
                    ? "pass"
                    : "fail",
                details: {
                    totalImages: d.summary.total,
                    withAlt: d.summary.withAlt,
                    missingAlt: d.summary.missingAlt,
                    emptyAlt: d.summary.emptyAlt,
                },
            };
        }
    }
}
/**
 * Build a human-readable summary from the evaluated checklist items.
 */
function buildSummary(items, score) {
    const auto = items.filter((i) => i.status !== "manual" && i.status !== "skipped");
    const passed = auto.filter((i) => i.status === "pass").length;
    // Checklist 2-C: error items are "未評価", count only evaluated items
    const evaluated = auto.filter((i) => i.status !== "error").length;
    const failures = items.filter((i) => i.status === "fail");
    const errors = items.filter((i) => i.status === "error");
    const manualCount = items.filter((i) => i.status === "manual").length;
    const parts = [];
    parts.push(`自動検証${evaluated}項目中${passed}項目合格（スコア: ${score}点）`);
    if (failures.length > 0) {
        const failDetails = failures
            .slice(0, 3)
            .map((f) => f.detail || f.label)
            .join("、");
        parts.push(`要対応: ${failDetails}${failures.length > 3 ? ` 他${failures.length - 3}件` : ""}`);
    }
    if (errors.length > 0) {
        parts.push(`${errors.length}項目は未評価（ツール実行エラー）`);
    }
    if (manualCount > 0) {
        parts.push(`${manualCount}項目は手動確認が必要`);
    }
    return parts.join("。");
}
/**
 * Run a Tier 2 workflow audit.
 *
 * 1. Determine required Tier 1 tools from checklist items
 * 2. Execute tools sequentially with progress notifications
 * 3. Evaluate each checklist item against collected results
 * 4. Calculate score and build summary
 * 5. Return structured AuditReport
 */
export async function runWorkflow(url, auditType, checkItems, onProgress, sendProgress) {
    const startTime = Date.now();
    const workflowDeadline = startTime + WORKFLOW_TIMEOUT_MS;
    // 1. Determine required Tier 1 tools (deduplicated)
    const requiredTools = new Set();
    for (const item of checkItems) {
        if (item.autoVerifiable && item.tier1Tool) {
            requiredTools.add(item.tier1Tool);
        }
    }
    // Define execution order (OGP first since it's reused, speed last since it's slowest)
    const executionOrder = [
        "ogp",
        "headings",
        "alt",
        "links",
        "speed",
    ];
    const toolsToExecute = executionOrder.filter((t) => requiredTools.has(t));
    // 2. Execute Tier 1 tools with progress
    const toolResults = {
        ogp: null,
        headings: null,
        links: null,
        speed: null,
        alt: null,
    };
    const totalTools = toolsToExecute.length;
    const startMsg = `監査開始: ${totalTools}つのチェックツールを実行します`;
    onProgress?.(startMsg);
    await sendProgress?.(0, totalTools + 1, startMsg);
    for (let i = 0; i < totalTools; i++) {
        const tool = toolsToExecute[i];
        // Checklist 2-C: workflow timeout check before starting tool
        const remainingMs = workflowDeadline - Date.now();
        if (remainingMs <= 0) {
            for (let j = i; j < totalTools; j++) {
                toolResults[toolsToExecute[j]] = {
                    error: "ワークフロータイムアウト（60秒）により実行をスキップ",
                };
            }
            break;
        }
        const progressMsg = `${i + 1}/${totalTools}: ${TOOL_DISPLAY_NAMES[tool]}...`;
        onProgress?.(progressMsg);
        await sendProgress?.(i + 1, totalTools + 1, progressMsg);
        // Checklist 2-C: enforce workflow timeout during tool execution via Promise.race
        let timeoutTimer;
        const timeoutPromise = new Promise((resolve) => {
            timeoutTimer = setTimeout(() => resolve({ error: "ワークフロータイムアウト（60秒）超過" }), remainingMs);
        });
        const result = await Promise.race([
            executeTier1Tool(url, tool),
            timeoutPromise,
        ]);
        clearTimeout(timeoutTimer);
        toolResults[tool] = result;
        // If workflow timed out during this tool, mark remaining as skipped
        if ("error" in result && result.error.includes("タイムアウト（60秒）")) {
            for (let j = i + 1; j < totalTools; j++) {
                toolResults[toolsToExecute[j]] = {
                    error: "ワークフロータイムアウト（60秒）により実行をスキップ",
                };
            }
            break;
        }
    }
    const completionMsg = "チェック完了。結果を集計中...";
    onProgress?.(completionMsg);
    await sendProgress?.(totalTools + 1, totalTools + 1, completionMsg);
    // 3. Evaluate each checklist item
    const evaluatedItems = checkItems.map((item) => {
        // Manual items
        if (!item.autoVerifiable) {
            return {
                id: item.id,
                category: item.category,
                label: item.label,
                status: "manual",
                detail: "手動で確認が必要です",
            };
        }
        // No evaluation function
        if (!item.evaluate || !item.tier1Tool) {
            return {
                id: item.id,
                category: item.category,
                label: item.label,
                status: "skipped",
                detail: "評価関数が未定義",
            };
        }
        // Check if the required tool has data
        const toolResult = toolResults[item.tier1Tool];
        if (!toolResult || "error" in toolResult) {
            return {
                id: item.id,
                category: item.category,
                label: item.label,
                status: "error",
                detail: toolResult
                    ? toolResult.error
                    : "ツールが実行されませんでした",
            };
        }
        // Run the evaluation function
        const evalResult = item.evaluate(toolResults);
        return {
            id: item.id,
            category: item.category,
            label: item.label,
            ...evalResult,
        };
    });
    // 4. Calculate score
    // Checklist 2-C: score is calculated only from successfully evaluated items.
    // Error items (from failed Tier 1 tools) are excluded ("未評価").
    // pass = full weight, warn = half weight, fail = 0
    const scorableItems = checkItems.filter((item) => item.autoVerifiable && item.evaluate && item.tier1Tool);
    const evaluableItems = scorableItems.filter((item) => {
        const evaluated = evaluatedItems.find((e) => e.id === item.id);
        return evaluated && evaluated.status !== "error";
    });
    const maxScore = evaluableItems.reduce((sum, item) => sum + item.weight, 0);
    let earnedScore = 0;
    for (const item of evaluableItems) {
        const evaluated = evaluatedItems.find((e) => e.id === item.id);
        if (!evaluated)
            continue;
        if (evaluated.status === "pass")
            earnedScore += item.weight;
        else if (evaluated.status === "warn")
            earnedScore += Math.round(item.weight * 0.5);
    }
    const score = maxScore > 0 ? Math.round((earnedScore / maxScore) * 100) : 0;
    // 5. Build tool results section
    const results = {};
    for (const tool of toolsToExecute) {
        results[tool] = buildToolResultSummary(tool, toolResults[tool]);
    }
    // 6. Build summary
    const summary = buildSummary(evaluatedItems, score);
    return {
        url,
        auditType,
        score,
        summary,
        results,
        checklist: {
            total: evaluatedItems.length,
            passed: evaluatedItems.filter((i) => i.status === "pass").length,
            warned: evaluatedItems.filter((i) => i.status === "warn").length,
            failed: evaluatedItems.filter((i) => i.status === "fail").length,
            errors: evaluatedItems.filter((i) => i.status === "error").length,
            manual: evaluatedItems.filter((i) => i.status === "manual").length,
            items: evaluatedItems,
        },
    };
}
//# sourceMappingURL=workflow-runner.js.map