/**
 * Human-readable summary builders for MCP tool results.
 *
 * Each function produces a concise text summary as the first content block
 * (for LLM consumption), while the full JSON remains in the second block.
 *
 * Design: Keep summaries short, factual, and actionable.
 * - Scores shown as X/100
 * - Status icons: PASS / WARN / FAIL
 * - Top issues listed (max 5)
 */

import type {
  AltCheckerResponse,
  LinkCheckerResponse,
  SpeedCheckerResponse,
  OgpCheckerResponse,
  HeadingExtractorResponse,
  SiteConfigCheckerResponse,
  SecurityHeadersCheckerResponse,
  CacheCheckerResponse,
  SchemaCheckerResponse,
  RedirectCheckerResponse,
  ImageCheckerResponse,
  AuditReport,
  CheckItemResult,
} from "./types.js";
import type { XCardPreviewResponse } from "./tools/tier1/x-card-preview.js";

// ---- Tier 1 Summaries ----

export function summarizeAltChecker(r: AltCheckerResponse): string {
  const { summary: s } = r;
  const lines = [
    `## Alt Attribute Check: ${r.url}`,
    "",
    `- Total images: ${s.total}`,
    `- With alt: ${s.withAlt}`,
    `- Missing alt: ${s.missingAlt}`,
    `- Empty alt: ${s.emptyAlt}`,
    `- Decorative: ${s.decorative}`,
  ];
  if (s.missingAlt > 0) {
    const missing = r.images
      .filter((img) => img.context === "missing")
      .slice(0, 5);
    lines.push("", "**Images missing alt:**");
    for (const img of missing) {
      lines.push(`- ${img.src}`);
    }
    if (s.missingAlt > 5) {
      lines.push(`- ... and ${s.missingAlt - 5} more`);
    }
  }
  return lines.join("\n");
}

export function summarizeLinkChecker(r: LinkCheckerResponse): string {
  const broken = r.links.filter(
    (l) => l.status >= 400 && !l.warning,
  );
  const botBlocked = r.links.filter(
    (l) => l.status >= 400 && l.warning,
  );
  const lines = [
    `## Link Check: ${r.checkedUrl}`,
    "",
    `- Total links: ${r.totalLinks}`,
    `- Broken: ${broken.length}`,
    `- Bot-blocked (e.g. 403): ${botBlocked.length}`,
  ];
  if (broken.length > 0) {
    lines.push("", "**Broken links:**");
    for (const link of broken.slice(0, 5)) {
      lines.push(`- [${link.status}] ${link.url}`);
    }
    if (broken.length > 5) {
      lines.push(`- ... and ${broken.length - 5} more`);
    }
  }
  return lines.join("\n");
}

export function summarizeSpeedChecker(r: SpeedCheckerResponse): string {
  const m = r.metrics;
  const lines = [
    `## PageSpeed (${r.strategy}): ${r.url}`,
    "",
    `**Performance: ${r.performanceScore}/100**`,
    "",
    "| Metric | Value | Score |",
    "|--------|-------|-------|",
    `| FCP | ${m.fcp.displayValue} | ${m.fcp.score} |`,
    `| LCP | ${m.lcp.displayValue} | ${m.lcp.score} |`,
    `| TBT | ${m.tbt.displayValue} | ${m.tbt.score} |`,
    `| CLS | ${m.cls.displayValue} | ${m.cls.score} |`,
    `| SI  | ${m.si.displayValue} | ${m.si.score} |`,
    `| TTI | ${m.tti.displayValue} | ${m.tti.score} |`,
  ];
  if (r.opportunities.length > 0) {
    lines.push("", "**Top opportunities:**");
    for (const opp of r.opportunities.slice(0, 5)) {
      lines.push(`- ${opp.title} (${opp.savings})`);
    }
  }
  if (r.accessibility.score != null) {
    lines.push("", `Accessibility score: ${r.accessibility.score}/100`);
    if (r.accessibility.colorContrast.violationCount > 0) {
      lines.push(
        `Color contrast violations: ${r.accessibility.colorContrast.violationCount}`,
      );
    }
  }
  return lines.join("\n");
}

export function summarizeOgpChecker(r: OgpCheckerResponse): string {
  const ok = (v: string) => (v ? "SET" : "MISSING");
  const lines = [
    `## OGP Check: ${r.rawUrl}`,
    "",
    "| Field | Status | Value |",
    "|-------|--------|-------|",
    `| og:title | ${ok(r.ogp.title)} | ${r.ogp.title || "-"} |`,
    `| og:description | ${ok(r.ogp.description)} | ${(r.ogp.description || "-").slice(0, 60)}${r.ogp.description?.length > 60 ? "..." : ""} |`,
    `| og:image | ${ok(r.ogp.image)} | ${r.ogp.image ? "Yes" : "-"} |`,
    `| twitter:card | ${ok(r.twitter.card)} | ${r.twitter.card || "-"} |`,
    `| canonical | ${ok(r.canonical)} | ${r.canonical || "-"} |`,
  ];
  if (r.jsonLd.length > 0) {
    const types = r.jsonLd.map((j) => j.type).join(", ");
    lines.push(`| JSON-LD | ${r.jsonLd.length} schema(s) | ${types} |`);
  } else {
    lines.push(`| JSON-LD | MISSING | - |`);
  }
  const faviconStatus = r.favicon.hasFavicon ? "SET" : "MISSING";
  lines.push(`| Favicon | ${faviconStatus} | ${r.favicon.icons.length} icon(s) |`);
  return lines.join("\n");
}

export function summarizeHeadingExtractor(
  r: HeadingExtractorResponse,
): string {
  const h1s = r.headings.filter((h) => h.level === 1);
  const lines = [
    `## Heading Structure: ${r.url}`,
    "",
    `- H1 count: ${h1s.length}${h1s.length === 1 ? "" : h1s.length === 0 ? " (MISSING)" : " (MULTIPLE)"}`,
    `- Total headings: ${r.headings.length}`,
  ];
  // Check hierarchy issues
  let prevLevel = 0;
  const skips: string[] = [];
  for (const h of r.headings) {
    if (prevLevel > 0 && h.level > prevLevel + 1) {
      skips.push(`H${prevLevel} → H${h.level}`);
    }
    prevLevel = h.level;
  }
  if (skips.length > 0) {
    lines.push(`- Hierarchy skips: ${skips.join(", ")}`);
  }
  if (r.headings.length > 0) {
    lines.push("", "**Headings:**");
    for (const h of r.headings.slice(0, 15)) {
      lines.push(`${"  ".repeat(h.level - 1)}- H${h.level}: ${h.text}`);
    }
    if (r.headings.length > 15) {
      lines.push(`- ... and ${r.headings.length - 15} more`);
    }
  }
  return lines.join("\n");
}

export function summarizeSiteConfigChecker(
  r: SiteConfigCheckerResponse,
): string {
  const lines = [
    `## Site Config: ${r.domain}`,
    "",
    `**robots.txt**: ${r.robots.exists ? "EXISTS" : "MISSING"}`,
  ];
  if (r.robots.exists) {
    lines.push(`- Rules: ${r.robots.rules}`);
    lines.push(
      `- Sitemap directive: ${r.robots.hasSitemapDirective ? "Yes" : "No"}`,
    );
    if (r.robots.issues.length > 0) {
      lines.push(`- Issues: ${r.robots.issues.join("; ")}`);
    }
  }
  lines.push(
    "",
    `**sitemap.xml**: ${r.sitemap.exists ? "EXISTS" : "MISSING"}`,
  );
  if (r.sitemap.exists) {
    lines.push(`- URLs: ${r.sitemap.urlCount}`);
    lines.push(`- Sitemap index: ${r.sitemap.isIndex ? "Yes" : "No"}`);
    if (r.sitemap.issues.length > 0) {
      lines.push(`- Issues: ${r.sitemap.issues.join("; ")}`);
    }
  }
  return lines.join("\n");
}

export function summarizeSecurityHeaders(
  r: SecurityHeadersCheckerResponse,
): string {
  const lines = [
    `## Security Headers: ${r.checkedUrl}`,
    "",
    `**Score: ${r.summary.score}/100** (${r.summary.present}/${r.summary.total} headers present)`,
    "",
    "| Header | Status | Value |",
    "|--------|--------|-------|",
  ];
  for (const h of r.headers) {
    const status = h.status.toUpperCase();
    const val = h.value ? h.value.slice(0, 50) + (h.value.length > 50 ? "..." : "") : "-";
    lines.push(`| ${h.name} | ${status} | ${val} |`);
  }
  return lines.join("\n");
}

export function summarizeCacheChecker(r: CacheCheckerResponse): string {
  const lines = [
    `## Cache Headers: ${r.checkedUrl}`,
    "",
    `**Score: ${r.summary.score}/100**`,
    `- Browser cache: ${r.summary.browserCache}`,
    `- CDN cache: ${r.summary.cdnCache}`,
    `- Headers present: ${r.summary.present}/${r.summary.total}`,
    "",
    "| Header | Status | Value |",
    "|--------|--------|-------|",
  ];
  for (const h of r.headers) {
    const status = h.status.toUpperCase();
    const val = h.value ? h.value.slice(0, 50) + (h.value.length > 50 ? "..." : "") : "-";
    lines.push(`| ${h.name} | ${status} | ${val} |`);
  }
  return lines.join("\n");
}

export function summarizeSchemaChecker(r: SchemaCheckerResponse): string {
  const lines = [
    `## Structured Data: ${r.checkedUrl}`,
    "",
    `**Score: ${r.summary.score}/100** (${r.summary.totalSchemas} schema(s) found)`,
    `- Types: ${r.summary.types.join(", ") || "none"}`,
    `- Pass: ${r.summary.passCount} / Warn: ${r.summary.warnCount} / Fail: ${r.summary.failCount}`,
  ];
  if (r.schemas.length > 0) {
    lines.push("", "| Schema | Status | Issues |", "|--------|--------|--------|");
    for (const s of r.schemas) {
      const issues = s.issues.length > 0 ? s.issues.slice(0, 3).join("; ") : "-";
      lines.push(`| ${s.type} | ${s.status.toUpperCase()} | ${issues} |`);
    }
  }
  return lines.join("\n");
}

export function summarizeRedirectChecker(
  r: RedirectCheckerResponse,
): string {
  const s = r.summary;
  const warnings: string[] = [];
  if (s.hasLoop) warnings.push("LOOP DETECTED");
  if (s.hasHttpDowngrade) warnings.push("HTTPS→HTTP DOWNGRADE");

  const lines = [
    `## Redirect Chain: ${r.checkedUrl}`,
    "",
    `- Status: ${s.chainStatus.toUpperCase()}`,
    `- Hops: ${s.totalHops}`,
    `- Final URL: ${s.finalUrl}`,
    `- Final status: ${s.finalStatus}`,
  ];
  if (warnings.length > 0) {
    lines.push(`- Warnings: ${warnings.join(", ")}`);
  }
  if (r.hops.length > 0) {
    lines.push("", "**Chain:**");
    for (const hop of r.hops) {
      lines.push(`  ${hop.statusCode} ${hop.url} → ${hop.location || "(final)"}`);
    }
  }
  return lines.join("\n");
}

export function summarizeImageChecker(r: ImageCheckerResponse): string {
  const s = r.summary;
  const lines = [
    `## Image Optimization: ${r.checkedUrl}`,
    "",
    `**Score: ${s.score}/100** (${s.totalImages} images analyzed, ${s.totalOnPage} on page)`,
    `- Next-gen format rate: ${Math.round(s.nextGenRate * 100)}%`,
    `- Lazy loading rate: ${Math.round(s.lazyRate * 100)}%`,
    `- Dimension rate: ${Math.round(s.dimensionRate * 100)}%`,
    `- Pass: ${s.passCount} / Warn: ${s.warnCount} / Fail: ${s.failCount}`,
  ];
  const failing = r.images.filter((img) => img.status === "fail").slice(0, 5);
  if (failing.length > 0) {
    lines.push("", "**Issues:**");
    for (const img of failing) {
      lines.push(`- ${img.src}: ${img.issues.join(", ")}`);
    }
    if (s.failCount > 5) {
      lines.push(`- ... and ${s.failCount - 5} more`);
    }
  }
  return lines.join("\n");
}

export function summarizeXCardPreview(r: XCardPreviewResponse): string {
  const v = r.validation;
  const lines = [
    `## X (Twitter) Card: ${r.url}`,
    "",
    `- Valid: ${v.isValid ? "YES" : "NO"}`,
    `- Card type: ${r.card.type}`,
    `- Title: ${r.card.title || "(empty)"}`,
    `- Description: ${(r.card.description || "(empty)").slice(0, 80)}${(r.card.description?.length || 0) > 80 ? "..." : ""}`,
    `- Image: ${r.card.image ? "SET" : "MISSING"}`,
  ];
  if (v.issues.length > 0) {
    lines.push("", "**Issues:**");
    for (const issue of v.issues) {
      lines.push(`- ${issue}`);
    }
  }
  return lines.join("\n");
}

// ---- Tier 2 Audit Report Summary ----

const STATUS_ICON: Record<string, string> = {
  pass: "PASS",
  warn: "WARN",
  fail: "FAIL",
  error: "ERROR",
  manual: "MANUAL",
  skipped: "SKIP",
};

export function summarizeAuditReport(report: AuditReport): string {
  const lines = [
    `## ${formatAuditType(report.auditType)}: ${report.url}`,
    "",
    `**Score: ${report.score}/100**`,
    `(${report.checklist.passed} passed / ${report.checklist.warned} warned / ${report.checklist.failed} failed / ${report.checklist.errors} errors / ${report.checklist.manual} manual)`,
    "",
    "| # | Category | Check | Status | Detail |",
    "|---|----------|-------|--------|--------|",
  ];
  for (let i = 0; i < report.checklist.items.length; i++) {
    const item = report.checklist.items[i];
    const status = STATUS_ICON[item.status] || item.status;
    const detail = truncate(item.detail || "-", 60);
    lines.push(
      `| ${i + 1} | ${item.category} | ${item.label} | ${status} | ${detail} |`,
    );
  }

  // Action items (failures)
  const failures = report.checklist.items.filter(
    (i) => i.status === "fail",
  );
  if (failures.length > 0) {
    lines.push("", "**Action required:**");
    for (const f of failures) {
      lines.push(`- ${f.label}: ${f.detail || "needs attention"}`);
    }
  }

  // Manual items
  const manuals = report.checklist.items.filter(
    (i) => i.status === "manual",
  );
  if (manuals.length > 0) {
    lines.push("", "**Manual checks needed:**");
    for (const m of manuals) {
      lines.push(`- ${m.label}`);
    }
  }

  return lines.join("\n");
}

function formatAuditType(type: string): string {
  switch (type) {
    case "seo_audit":
      return "SEO Audit";
    case "web_launch_audit":
      return "Web Launch Audit";
    case "freelance_delivery_audit":
      return "Freelance Delivery Audit";
    default:
      return type;
  }
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 3) + "...";
}
