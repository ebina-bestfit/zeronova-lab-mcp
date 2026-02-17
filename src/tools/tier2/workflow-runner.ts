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
import {
  checkOgp,
  checkLinks,
  checkSpeed,
  extractHeadings,
  checkAltAttributes,
  checkSiteConfig,
} from "../../client.js";
import type {
  CheckItemDefinition,
  CheckItemResult,
  CheckStatus,
  CollectedToolResults,
  Tier1ToolName,
  ToolResultSummary,
  AuditReport,
  OgpCheckerResponse,
  HeadingExtractorResponse,
  LinkCheckerResponse,
  SpeedCheckerResponse,
  AltCheckerResponse,
  SiteConfigCheckerResponse,
} from "../../types.js";

// Checklist 2-C: Workflow timeout = 60 seconds
const WORKFLOW_TIMEOUT_MS = 60_000;

const TOOL_DISPLAY_NAMES: Record<Tier1ToolName, string> = {
  ogp: "OGPチェック中",
  headings: "見出し構造チェック中",
  links: "リンクチェック中",
  speed: "ページ速度チェック中",
  alt: "alt属性チェック中",
  siteConfig: "サイト設定チェック中",
};

/**
 * Execute a single Tier 1 tool and return its result.
 * Individual tool errors are caught and returned as error results.
 * Checklist 2-C: individual tool failure does not stop the workflow.
 */
async function executeTier1Tool(
  url: string,
  tool: Tier1ToolName,
): Promise<
  | { data: OgpCheckerResponse | HeadingExtractorResponse | LinkCheckerResponse | SpeedCheckerResponse | AltCheckerResponse | SiteConfigCheckerResponse }
  | { error: string }
> {
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
      case "siteConfig":
        return { data: await checkSiteConfig(url) };
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return { error: message };
  }
}

/**
 * Build a ToolResultSummary from a collected tool result for the report.
 */
function buildToolResultSummary(
  tool: Tier1ToolName,
  result: CollectedToolResults[Tier1ToolName],
): ToolResultSummary {
  if (!result) {
    return { status: "skipped", details: { reason: "Not required" } };
  }
  if ("error" in result) {
    return { status: "error", details: { error: result.error } };
  }

  // Build details preserving as much Tier 1 tool data as possible.
  // The workflow report should NOT degrade information from the site API.
  switch (tool) {
    case "ogp": {
      const d = result.data as OgpCheckerResponse;
      const hasTitle = !!d.ogp.title;
      const hasDesc = !!d.ogp.description;
      const hasImage = !!d.ogp.image;
      const hasCard = !!d.twitter.card;
      const allGood = hasTitle && hasDesc && hasImage && hasCard;
      return {
        status: allGood ? "pass" : hasTitle ? "warn" : "fail",
        details: {
          ogp: {
            title: d.ogp.title || null,
            titleLength: d.ogp.title ? d.ogp.title.length : 0,
            description: d.ogp.description || null,
            descriptionLength: d.ogp.description ? d.ogp.description.length : 0,
            image: d.ogp.image || null,
            url: d.ogp.url || null,
            type: d.ogp.type || null,
            siteName: d.ogp.siteName || null,
          },
          twitter: {
            card: d.twitter.card || null,
            title: d.twitter.title || null,
            description: d.twitter.description || null,
            image: d.twitter.image || null,
          },
          canonical: d.canonical || null,
          jsonLd: d.jsonLd.map((item) => ({
            type: item.type,
            valid: item.valid,
          })),
          jsonLdCount: d.jsonLd.length,
        },
      };
    }
    case "headings": {
      const d = result.data as HeadingExtractorResponse;
      const h1Count = d.headings.filter((h) => h.level === 1).length;
      // Check for hierarchy skips
      let prevLevel = 0;
      const hierarchyIssues: string[] = [];
      for (const h of d.headings) {
        if (h.level > prevLevel + 1 && prevLevel > 0) {
          hierarchyIssues.push(`H${prevLevel}→H${h.level}`);
        }
        prevLevel = h.level;
      }
      return {
        status: h1Count === 1 && hierarchyIssues.length === 0
          ? "pass"
          : h1Count === 0
            ? "fail"
            : "warn",
        details: {
          h1Count,
          totalHeadings: d.headings.length,
          headings: d.headings,
          ...(hierarchyIssues.length > 0 ? { hierarchyIssues } : {}),
          issue:
            h1Count === 0
              ? "H1タグがありません"
              : h1Count > 1
                ? `H1が${h1Count}個あります（推奨: 1つ）`
                : undefined,
        },
      };
    }
    case "links": {
      const d = result.data as LinkCheckerResponse;
      const trulyBroken = d.links.filter(
        (l) => l.status >= 400 && !l.warning,
      );
      const botBlocked = d.links.filter(
        (l) => l.status >= 400 && !!l.warning,
      );
      const brokenUrls = trulyBroken.slice(0, 5).map((l) => ({
        url: l.url,
        text: l.text,
        status: l.status,
        statusText: l.statusText,
        isExternal: l.isExternal,
      }));
      const blockedUrls = botBlocked.slice(0, 3).map((l) => ({
        url: l.url,
        text: l.text,
        status: l.status,
        warning: l.warning,
      }));
      const status: CheckStatus =
        trulyBroken.length > 0
          ? "fail"
          : botBlocked.length > 0
            ? "warn"
            : "pass";
      return {
        status,
        details: {
          total: d.totalLinks,
          broken: trulyBroken.length,
          botBlocked: botBlocked.length,
          ...(brokenUrls.length > 0 ? { brokenUrls } : {}),
          ...(blockedUrls.length > 0 ? { blockedUrls } : {}),
        },
      };
    }
    case "speed": {
      const d = result.data as SpeedCheckerResponse;
      const lcpMs = parseFloat(d.metrics.lcp.value);
      const lcpSec = lcpMs / 1000;
      const clsVal = parseFloat(d.metrics.cls.value);
      const issues: string[] = [];
      if (lcpSec > 2.5) issues.push(`LCP ${lcpSec.toFixed(1)}秒`);
      if (clsVal > 0.1) issues.push(`CLS ${clsVal.toFixed(3)}`);
      if (d.performanceScore < 50)
        issues.push(`スコア${d.performanceScore}点`);
      return {
        status:
          d.performanceScore >= 90 && issues.length === 0
            ? "pass"
            : d.performanceScore >= 50
              ? "warn"
              : "fail",
        details: {
          performanceScore: d.performanceScore,
          strategy: d.strategy,
          metrics: {
            fcp: { value: d.metrics.fcp.displayValue, score: d.metrics.fcp.score },
            lcp: { value: d.metrics.lcp.displayValue, score: d.metrics.lcp.score },
            tbt: { value: d.metrics.tbt.displayValue, score: d.metrics.tbt.score },
            cls: { value: d.metrics.cls.displayValue, score: d.metrics.cls.score },
            si: { value: d.metrics.si.displayValue, score: d.metrics.si.score },
            tti: { value: d.metrics.tti.displayValue, score: d.metrics.tti.score },
          },
          ...(d.opportunities.length > 0
            ? { opportunities: d.opportunities.slice(0, 5) }
            : {}),
          ...(issues.length > 0 ? { issue: issues.join(", ") } : {}),
        },
      };
    }
    case "alt": {
      const d = result.data as AltCheckerResponse;
      // Include URLs of images with missing/empty alt for actionable feedback
      const missingAltImages = d.images
        .filter((img) => img.context === "missing" || img.context === "empty")
        .slice(0, 10)
        .map((img) => ({
          src: img.src,
          context: img.context,
          ...(img.alt !== null ? { alt: img.alt } : {}),
        }));
      return {
        status:
          d.summary.total === 0 || d.summary.missingAlt === 0
            ? "pass"
            : "fail",
        details: {
          totalImages: d.summary.total,
          withAlt: d.summary.withAlt,
          missingAlt: d.summary.missingAlt,
          emptyAlt: d.summary.emptyAlt,
          decorative: d.summary.decorative,
          ...(missingAltImages.length > 0 ? { missingAltImages } : {}),
        },
      };
    }
    case "siteConfig": {
      const d = result.data as SiteConfigCheckerResponse;
      const robotsOk = d.robots.exists && d.robots.issues.length === 0;
      const sitemapOk = d.sitemap.exists && d.sitemap.urlCount > 0 && d.sitemap.issues.length === 0;
      const allGood = robotsOk && sitemapOk;
      return {
        status: allGood ? "pass" : !d.robots.exists && !d.sitemap.exists ? "fail" : "warn",
        details: {
          robots: {
            exists: d.robots.exists,
            content: d.robots.content,
            rules: d.robots.rules,
            hasSitemapDirective: d.robots.hasSitemapDirective,
            sitemapUrls: d.robots.sitemapUrls,
            issues: d.robots.issues,
          },
          sitemap: {
            exists: d.sitemap.exists,
            url: d.sitemap.url,
            urlCount: d.sitemap.urlCount,
            isIndex: d.sitemap.isIndex,
            issues: d.sitemap.issues,
          },
          domain: d.domain,
        },
      };
    }
  }
}

/**
 * Build a human-readable summary from the evaluated checklist items.
 */
function buildSummary(
  items: CheckItemResult[],
  score: number,
): string {
  const auto = items.filter(
    (i) => i.status !== "manual" && i.status !== "skipped",
  );
  const passed = auto.filter((i) => i.status === "pass").length;
  // Checklist 2-C: error items are "未評価", count only evaluated items
  const evaluated = auto.filter((i) => i.status !== "error").length;

  const failures = items.filter((i) => i.status === "fail");
  const errors = items.filter((i) => i.status === "error");
  const manualCount = items.filter((i) => i.status === "manual").length;

  const parts: string[] = [];
  parts.push(`自動検証${evaluated}項目中${passed}項目合格（スコア: ${score}点）`);

  if (failures.length > 0) {
    const failDetails = failures
      .slice(0, 3)
      .map((f) => f.detail || f.label)
      .join("、");
    parts.push(
      `要対応: ${failDetails}${failures.length > 3 ? ` 他${failures.length - 3}件` : ""}`,
    );
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
export async function runWorkflow(
  url: string,
  auditType: string,
  checkItems: CheckItemDefinition[],
  onProgress?: (message: string) => void,
  sendProgress?: (progress: number, total: number, message: string) => Promise<void>,
): Promise<AuditReport> {
  const startTime = Date.now();
  const workflowDeadline = startTime + WORKFLOW_TIMEOUT_MS;

  // 1. Determine required Tier 1 tools (deduplicated)
  const requiredTools = new Set<Tier1ToolName>();
  for (const item of checkItems) {
    if (item.autoVerifiable && item.tier1Tool) {
      requiredTools.add(item.tier1Tool);
    }
  }

  // Define execution order (OGP first since it's reused, speed last since it's slowest)
  const executionOrder: Tier1ToolName[] = [
    "ogp",
    "headings",
    "alt",
    "links",
    "siteConfig",
    "speed",
  ];
  const toolsToExecute = executionOrder.filter((t) => requiredTools.has(t));

  // 2. Execute Tier 1 tools with progress
  const toolResults: CollectedToolResults = {
    ogp: null,
    headings: null,
    links: null,
    speed: null,
    alt: null,
    siteConfig: null,
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
        (toolResults as unknown as Record<string, unknown>)[toolsToExecute[j]] = {
          error: "ワークフロータイムアウト（60秒）により実行をスキップ",
        };
      }
      break;
    }

    const progressMsg = `${i + 1}/${totalTools}: ${TOOL_DISPLAY_NAMES[tool]}...`;
    onProgress?.(progressMsg);
    await sendProgress?.(i + 1, totalTools + 1, progressMsg);

    // Checklist 2-C: enforce workflow timeout during tool execution via Promise.race
    let timeoutTimer: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<{ error: string }>((resolve) => {
      timeoutTimer = setTimeout(
        () => resolve({ error: "ワークフロータイムアウト（60秒）超過" }),
        remainingMs,
      );
    });

    const result = await Promise.race([
      executeTier1Tool(url, tool),
      timeoutPromise,
    ]);
    clearTimeout(timeoutTimer);

    (toolResults as unknown as Record<string, unknown>)[tool] = result;

    // If workflow timed out during this tool, mark remaining as skipped
    if ("error" in result && result.error.includes("タイムアウト（60秒）")) {
      for (let j = i + 1; j < totalTools; j++) {
        (toolResults as unknown as Record<string, unknown>)[toolsToExecute[j]] = {
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
  const evaluatedItems: CheckItemResult[] = checkItems.map((item) => {
    // Manual items
    if (!item.autoVerifiable) {
      return {
        id: item.id,
        category: item.category,
        label: item.label,
        status: "manual" as CheckStatus,
        detail: "手動で確認が必要です",
      };
    }

    // No evaluation function
    if (!item.evaluate || !item.tier1Tool) {
      return {
        id: item.id,
        category: item.category,
        label: item.label,
        status: "skipped" as CheckStatus,
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
        status: "error" as CheckStatus,
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
  const scorableItems = checkItems.filter(
    (item) => item.autoVerifiable && item.evaluate && item.tier1Tool,
  );
  const evaluableItems = scorableItems.filter((item) => {
    const evaluated = evaluatedItems.find((e) => e.id === item.id);
    return evaluated && evaluated.status !== "error";
  });
  const maxScore = evaluableItems.reduce((sum, item) => sum + item.weight, 0);

  let earnedScore = 0;
  for (const item of evaluableItems) {
    const evaluated = evaluatedItems.find((e) => e.id === item.id);
    if (!evaluated) continue;
    if (evaluated.status === "pass") earnedScore += item.weight;
    else if (evaluated.status === "warn")
      earnedScore += Math.round(item.weight * 0.5);
  }

  const score = maxScore > 0 ? Math.round((earnedScore / maxScore) * 100) : 0;

  // 5. Build tool results section
  const results: Record<string, ToolResultSummary> = {};
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
