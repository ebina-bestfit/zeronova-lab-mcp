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
import type {
  CheckItemDefinition,
  CollectedToolResults,
  CheckStatus,
} from "../../types.js";

// ---- Helper to safely get tool data ----

function getOgpData(results: CollectedToolResults) {
  const r = results.ogp;
  if (!r || "error" in r) return null;
  return r.data;
}

function getHeadingsData(results: CollectedToolResults) {
  const r = results.headings;
  if (!r || "error" in r) return null;
  return r.data;
}

function getLinksData(results: CollectedToolResults) {
  const r = results.links;
  if (!r || "error" in r) return null;
  return r.data;
}

function getSpeedData(results: CollectedToolResults) {
  const r = results.speed;
  if (!r || "error" in r) return null;
  return r.data;
}

function getAltData(results: CollectedToolResults) {
  const r = results.alt;
  if (!r || "error" in r) return null;
  return r.data;
}

function toolError(
  toolName: string,
): { status: CheckStatus; detail: string } {
  return { status: "error", detail: `${toolName}のデータ取得に失敗` };
}

// ---- Shared evaluation functions ----

function evalMetaTitle(
  results: CollectedToolResults,
): { status: CheckStatus; detail?: string } {
  const ogp = getOgpData(results);
  if (!ogp) return toolError("OGPチェッカー");
  const title = ogp.ogp.title;
  if (!title) return { status: "fail", detail: "タイトルタグが未設定" };
  const len = title.length;
  if (len >= 30 && len <= 60)
    return { status: "pass", detail: `${len}文字（適切）` };
  if (len < 30)
    return { status: "warn", detail: `${len}文字（短い。推奨: 30〜60文字）` };
  return { status: "warn", detail: `${len}文字（長い。推奨: 30〜60文字）` };
}

function evalMetaDescription(
  results: CollectedToolResults,
): { status: CheckStatus; detail?: string } {
  const ogp = getOgpData(results);
  if (!ogp) return toolError("OGPチェッカー");
  const desc = ogp.ogp.description;
  if (!desc)
    return { status: "fail", detail: "メタディスクリプションが未設定" };
  const len = desc.length;
  if (len >= 80 && len <= 160)
    return { status: "pass", detail: `${len}文字（適切）` };
  if (len < 80)
    return {
      status: "warn",
      detail: `${len}文字（短い。推奨: 80〜160文字）`,
    };
  return {
    status: "warn",
    detail: `${len}文字（長い。推奨: 80〜160文字）`,
  };
}

function evalOgpImage(
  results: CollectedToolResults,
): { status: CheckStatus; detail?: string } {
  const ogp = getOgpData(results);
  if (!ogp) return toolError("OGPチェッカー");
  if (ogp.ogp.image)
    return { status: "pass", detail: "OGP画像が設定済み" };
  return { status: "fail", detail: "OGP画像が未設定" };
}

function evalTwitterCard(
  results: CollectedToolResults,
): { status: CheckStatus; detail?: string } {
  const ogp = getOgpData(results);
  if (!ogp) return toolError("OGPチェッカー");
  if (ogp.twitter.card)
    return {
      status: "pass",
      detail: `twitter:card = "${ogp.twitter.card}"`,
    };
  return { status: "fail", detail: "twitter:card メタタグが未設定" };
}

function evalTwitterImage(
  results: CollectedToolResults,
): { status: CheckStatus; detail?: string } {
  const ogp = getOgpData(results);
  if (!ogp) return toolError("OGPチェッカー");
  if (ogp.twitter.image || ogp.ogp.image)
    return { status: "pass", detail: "Twitter Card画像が設定済み" };
  return { status: "fail", detail: "Twitter Card画像が未設定" };
}

function evalH1Unique(
  results: CollectedToolResults,
): { status: CheckStatus; detail?: string } {
  const headings = getHeadingsData(results);
  if (!headings) return toolError("見出し抽出ツール");
  const h1s = headings.headings.filter((h) => h.level === 1);
  if (h1s.length === 1)
    return { status: "pass", detail: `H1: "${h1s[0].text}"` };
  if (h1s.length === 0)
    return { status: "fail", detail: "H1タグが存在しません" };
  return {
    status: "warn",
    detail: `H1が${h1s.length}個あります（推奨: 1ページ1つ）`,
  };
}

function evalHeadingHierarchy(
  results: CollectedToolResults,
): { status: CheckStatus; detail?: string } {
  const headings = getHeadingsData(results);
  if (!headings) return toolError("見出し抽出ツール");
  if (headings.headings.length === 0)
    return { status: "warn", detail: "見出しが1つもありません" };

  let prevLevel = 0;
  const issues: string[] = [];
  for (const h of headings.headings) {
    if (h.level > prevLevel + 1 && prevLevel > 0) {
      issues.push(`H${prevLevel}→H${h.level}`);
    }
    prevLevel = h.level;
  }

  if (issues.length === 0)
    return {
      status: "pass",
      detail: `${headings.headings.length}個の見出し、正しい階層`,
    };
  return {
    status: "warn",
    detail: `階層スキップあり: ${issues.slice(0, 3).join(", ")}${issues.length > 3 ? ` 他${issues.length - 3}件` : ""}`,
  };
}

function evalAltAttributes(
  results: CollectedToolResults,
): { status: CheckStatus; detail?: string } {
  const alt = getAltData(results);
  if (!alt) return toolError("alt属性チェッカー");
  if (alt.summary.total === 0)
    return { status: "pass", detail: "画像なし" };
  if (alt.summary.missingAlt === 0)
    return {
      status: "pass",
      detail: `全${alt.summary.total}画像にalt設定済み`,
    };
  return {
    status: "fail",
    detail: `${alt.summary.missingAlt}件のalt未設定（全${alt.summary.total}画像中）`,
  };
}

function evalNoBrokenLinks(
  results: CollectedToolResults,
): { status: CheckStatus; detail?: string } {
  const links = getLinksData(results);
  if (!links) return toolError("リンク切れチェッカー");
  const brokenLinks = links.links.filter((l) => l.status >= 400);
  if (brokenLinks.length === 0)
    return {
      status: "pass",
      detail: `${links.totalLinks}リンク全て正常`,
    };
  return {
    status: "fail",
    detail: `${brokenLinks.length}件のリンク切れ（全${links.totalLinks}リンク中）`,
  };
}

function evalPerformanceScore(
  results: CollectedToolResults,
): { status: CheckStatus; detail?: string } {
  const speed = getSpeedData(results);
  if (!speed) return toolError("ページ速度チェッカー");
  const score = speed.performanceScore;
  if (score >= 90)
    return { status: "pass", detail: `${score}点（優秀）` };
  if (score >= 50)
    return { status: "warn", detail: `${score}点（改善余地あり）` };
  return { status: "fail", detail: `${score}点（要改善、50点未満）` };
}

function evalLCP(
  results: CollectedToolResults,
): { status: CheckStatus; detail?: string } {
  const speed = getSpeedData(results);
  if (!speed) return toolError("ページ速度チェッカー");
  // LCP value is in milliseconds as a string (e.g., "2500")
  const lcpMs = parseFloat(speed.metrics.lcp.value);
  const lcpSec = lcpMs / 1000;
  if (lcpSec <= 2.5)
    return { status: "pass", detail: `${lcpSec.toFixed(1)}秒` };
  if (lcpSec <= 4.0)
    return {
      status: "warn",
      detail: `${lcpSec.toFixed(1)}秒（推奨: 2.5秒以下）`,
    };
  return {
    status: "fail",
    detail: `${lcpSec.toFixed(1)}秒（要改善: 4秒超）`,
  };
}

function evalCLS(
  results: CollectedToolResults,
): { status: CheckStatus; detail?: string } {
  const speed = getSpeedData(results);
  if (!speed) return toolError("ページ速度チェッカー");
  const clsValue = parseFloat(speed.metrics.cls.value);
  if (clsValue <= 0.1)
    return { status: "pass", detail: `CLS ${clsValue.toFixed(3)}` };
  if (clsValue <= 0.25)
    return {
      status: "warn",
      detail: `CLS ${clsValue.toFixed(3)}（推奨: 0.1以下）`,
    };
  return {
    status: "fail",
    detail: `CLS ${clsValue.toFixed(3)}（要改善: 0.25超）`,
  };
}

function evalMetaTitleExists(
  results: CollectedToolResults,
): { status: CheckStatus; detail?: string } {
  const ogp = getOgpData(results);
  if (!ogp) return toolError("OGPチェッカー");
  if (ogp.ogp.title)
    return { status: "pass", detail: `タイトル設定済み（${ogp.ogp.title.length}文字）` };
  return { status: "fail", detail: "タイトルタグが未設定" };
}

function evalH1Exists(
  results: CollectedToolResults,
): { status: CheckStatus; detail?: string } {
  const headings = getHeadingsData(results);
  if (!headings) return toolError("見出し抽出ツール");
  const h1s = headings.headings.filter((h) => h.level === 1);
  if (h1s.length > 0)
    return { status: "pass", detail: `H1: "${h1s[0].text}"` };
  return { status: "fail", detail: "H1タグが存在しません" };
}

// ---- SEO Audit Checklist ----

export const seoAuditChecklist: CheckItemDefinition[] = [
  // メタ情報
  {
    id: "seo-meta-title",
    category: "メタ情報",
    label: "タイトルタグが30〜60文字で設定されているか",
    weight: 10,
    autoVerifiable: true,
    tier1Tool: "ogp",
    evaluate: evalMetaTitle,
  },
  {
    id: "seo-meta-description",
    category: "メタ情報",
    label: "メタディスクリプションが80〜160文字で設定されているか",
    weight: 10,
    autoVerifiable: true,
    tier1Tool: "ogp",
    evaluate: evalMetaDescription,
  },
  {
    id: "seo-canonical",
    category: "メタ情報",
    label: "canonical URLが正しく設定されているか",
    weight: 5,
    autoVerifiable: false,
  },
  // 構造化データ
  {
    id: "seo-jsonld",
    category: "構造化データ",
    label: "JSON-LD構造化データが設定されているか",
    weight: 5,
    autoVerifiable: false,
  },
  // クローラビリティ
  {
    id: "seo-robots-txt",
    category: "クローラビリティ",
    label: "robots.txtが適切に設定されているか",
    weight: 5,
    autoVerifiable: false,
  },
  {
    id: "seo-sitemap",
    category: "クローラビリティ",
    label: "XMLサイトマップが生成・送信されているか",
    weight: 5,
    autoVerifiable: false,
  },
  // コンテンツ
  {
    id: "seo-h1-unique",
    category: "コンテンツ",
    label: "H1タグがページに1つだけ存在するか",
    weight: 10,
    autoVerifiable: true,
    tier1Tool: "headings",
    evaluate: evalH1Unique,
  },
  {
    id: "seo-heading-hierarchy",
    category: "コンテンツ",
    label: "見出し階層が正しい順序になっているか",
    weight: 8,
    autoVerifiable: true,
    tier1Tool: "headings",
    evaluate: evalHeadingHierarchy,
  },
  {
    id: "seo-alt-attributes",
    category: "コンテンツ",
    label: "全画像にalt属性が設定されているか",
    weight: 10,
    autoVerifiable: true,
    tier1Tool: "alt",
    evaluate: evalAltAttributes,
  },
  // パフォーマンス
  {
    id: "seo-performance-score",
    category: "パフォーマンス",
    label: "パフォーマンススコアが50点以上か（モバイル）",
    weight: 10,
    autoVerifiable: true,
    tier1Tool: "speed",
    evaluate: evalPerformanceScore,
  },
  {
    id: "seo-lcp",
    category: "パフォーマンス",
    label: "LCP（Largest Contentful Paint）が2.5秒以下か",
    weight: 8,
    autoVerifiable: true,
    tier1Tool: "speed",
    evaluate: evalLCP,
  },
  {
    id: "seo-cls",
    category: "パフォーマンス",
    label: "CLS（Cumulative Layout Shift）が0.1以下か",
    weight: 8,
    autoVerifiable: true,
    tier1Tool: "speed",
    evaluate: evalCLS,
  },
  // SNS
  {
    id: "seo-ogp-image",
    category: "SNS",
    label: "OGP画像が正しく設定されているか",
    weight: 8,
    autoVerifiable: true,
    tier1Tool: "ogp",
    evaluate: evalOgpImage,
  },
  {
    id: "seo-twitter-card",
    category: "SNS",
    label: "Twitter Cardが設定されているか",
    weight: 5,
    autoVerifiable: true,
    tier1Tool: "ogp",
    evaluate: evalTwitterCard,
  },
  {
    id: "seo-twitter-image",
    category: "SNS",
    label: "Twitter Card画像が設定されているか",
    weight: 5,
    autoVerifiable: true,
    tier1Tool: "ogp",
    evaluate: evalTwitterImage,
  },
  // リンク
  {
    id: "seo-no-broken-links",
    category: "リンク",
    label: "内部・外部リンクが全て正常か",
    weight: 10,
    autoVerifiable: true,
    tier1Tool: "links",
    evaluate: evalNoBrokenLinks,
  },
];

// ---- Web Launch Audit Checklist ----

export const webLaunchAuditChecklist: CheckItemDefinition[] = [
  // SEO
  {
    id: "wl-meta-title",
    category: "SEO",
    label: "メタタイトルが適切な文字数（30〜60文字）か",
    weight: 10,
    autoVerifiable: true,
    tier1Tool: "ogp",
    evaluate: evalMetaTitle,
  },
  {
    id: "wl-meta-description",
    category: "SEO",
    label: "メタディスクリプションが設定されているか（80〜160文字）",
    weight: 10,
    autoVerifiable: true,
    tier1Tool: "ogp",
    evaluate: evalMetaDescription,
  },
  {
    id: "wl-ogp-image",
    category: "SEO",
    label: "OGP画像が正しく表示されるか",
    weight: 8,
    autoVerifiable: true,
    tier1Tool: "ogp",
    evaluate: evalOgpImage,
  },
  {
    id: "wl-twitter-card",
    category: "SEO",
    label: "X(Twitter)カードが適切に表示されるか",
    weight: 5,
    autoVerifiable: true,
    tier1Tool: "ogp",
    evaluate: evalTwitterCard,
  },
  {
    id: "wl-heading-structure",
    category: "SEO",
    label: "見出し構造（H1〜H6）が正しい階層か",
    weight: 8,
    autoVerifiable: true,
    tier1Tool: "headings",
    evaluate: evalHeadingHierarchy,
  },
  {
    id: "wl-h1-unique",
    category: "SEO",
    label: "H1タグが1つだけ存在するか",
    weight: 8,
    autoVerifiable: true,
    tier1Tool: "headings",
    evaluate: evalH1Unique,
  },
  {
    id: "wl-robots-txt",
    category: "SEO",
    label: "robots.txtでクロールを許可しているか",
    weight: 5,
    autoVerifiable: false,
  },
  {
    id: "wl-sitemap",
    category: "SEO",
    label: "サイトマップXMLが生成されているか",
    weight: 5,
    autoVerifiable: false,
  },
  {
    id: "wl-jsonld",
    category: "SEO",
    label: "構造化データ（JSON-LD）を設定しているか",
    weight: 5,
    autoVerifiable: false,
  },
  // パフォーマンス
  {
    id: "wl-speed-score",
    category: "パフォーマンス",
    label: "ページ表示速度がモバイルで50点以上か",
    weight: 10,
    autoVerifiable: true,
    tier1Tool: "speed",
    evaluate: evalPerformanceScore,
  },
  {
    id: "wl-lcp",
    category: "パフォーマンス",
    label: "LCPが2.5秒以下か",
    weight: 8,
    autoVerifiable: true,
    tier1Tool: "speed",
    evaluate: evalLCP,
  },
  {
    id: "wl-cls",
    category: "パフォーマンス",
    label: "CLSが0.1以下か",
    weight: 8,
    autoVerifiable: true,
    tier1Tool: "speed",
    evaluate: evalCLS,
  },
  // 品質
  {
    id: "wl-no-broken-links",
    category: "品質",
    label: "リンク切れがないか",
    weight: 10,
    autoVerifiable: true,
    tier1Tool: "links",
    evaluate: evalNoBrokenLinks,
  },
  {
    id: "wl-alt-attributes",
    category: "品質",
    label: "全画像にalt属性が設定されているか",
    weight: 8,
    autoVerifiable: true,
    tier1Tool: "alt",
    evaluate: evalAltAttributes,
  },
  {
    id: "wl-contrast",
    category: "品質",
    label: "カラーコントラスト比が基準を満たしているか",
    weight: 5,
    autoVerifiable: false,
  },
  // ブランディング
  {
    id: "wl-favicon",
    category: "ブランディング",
    label: "ファビコンが設定されているか",
    weight: 3,
    autoVerifiable: false,
  },
  {
    id: "wl-og-brand",
    category: "ブランディング",
    label: "OGP画像がブランドに合ったデザインか",
    weight: 3,
    autoVerifiable: false,
  },
  // セキュリティ
  {
    id: "wl-password",
    category: "セキュリティ",
    label: "管理画面のパスワードが十分に強固か",
    weight: 5,
    autoVerifiable: false,
  },
];

// ---- Freelance Delivery Audit Checklist ----

export const freelanceDeliveryAuditChecklist: CheckItemDefinition[] = [
  // 品質確認
  {
    id: "fl-no-broken-links",
    category: "品質確認",
    label: "全ページのリンクが正常に動作するか",
    weight: 10,
    autoVerifiable: true,
    tier1Tool: "links",
    evaluate: evalNoBrokenLinks,
  },
  {
    id: "fl-speed-score",
    category: "品質確認",
    label: "ページ表示速度が許容範囲か（モバイル50点以上）",
    weight: 10,
    autoVerifiable: true,
    tier1Tool: "speed",
    evaluate: evalPerformanceScore,
  },
  {
    id: "fl-alt-attributes",
    category: "品質確認",
    label: "全画像にalt属性が設定されているか",
    weight: 8,
    autoVerifiable: true,
    tier1Tool: "alt",
    evaluate: evalAltAttributes,
  },
  {
    id: "fl-h1-exists",
    category: "品質確認",
    label: "H1タグが存在するか",
    weight: 5,
    autoVerifiable: true,
    tier1Tool: "headings",
    evaluate: evalH1Exists,
  },
  {
    id: "fl-contrast",
    category: "品質確認",
    label: "カラーコントラストがWCAG基準を満たしているか",
    weight: 5,
    autoVerifiable: false,
  },
  {
    id: "fl-proofreading",
    category: "品質確認",
    label: "テキストに誤字脱字がないか",
    weight: 5,
    autoVerifiable: false,
  },
  // SEO設定
  {
    id: "fl-meta-title",
    category: "SEO設定",
    label: "メタタグ（タイトル）が全ページに設定されているか",
    weight: 8,
    autoVerifiable: true,
    tier1Tool: "ogp",
    evaluate: evalMetaTitleExists,
  },
  {
    id: "fl-meta-description",
    category: "SEO設定",
    label: "メタディスクリプションが適切な長さか",
    weight: 8,
    autoVerifiable: true,
    tier1Tool: "ogp",
    evaluate: evalMetaDescription,
  },
  {
    id: "fl-ogp-image",
    category: "SEO設定",
    label: "OGP画像が正しく設定されているか",
    weight: 5,
    autoVerifiable: true,
    tier1Tool: "ogp",
    evaluate: evalOgpImage,
  },
  {
    id: "fl-favicon",
    category: "SEO設定",
    label: "ファビコンが設定されているか",
    weight: 3,
    autoVerifiable: false,
  },
  // 納品物
  {
    id: "fl-invoice",
    category: "納品物",
    label: "請求書番号を採番したか",
    weight: 3,
    autoVerifiable: false,
  },
  {
    id: "fl-pricing",
    category: "納品物",
    label: "料金・見積もりに相違がないか",
    weight: 3,
    autoVerifiable: false,
  },
  // セキュリティ
  {
    id: "fl-password",
    category: "セキュリティ",
    label: "管理画面やFTPのパスワードを安全に設定したか",
    weight: 5,
    autoVerifiable: false,
  },
];
