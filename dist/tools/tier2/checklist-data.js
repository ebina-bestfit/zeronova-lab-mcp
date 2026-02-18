// ---- Helper to safely get tool data ----
function getOgpData(results) {
    const r = results.ogp;
    if (!r || "error" in r)
        return null;
    return r.data;
}
function getHeadingsData(results) {
    const r = results.headings;
    if (!r || "error" in r)
        return null;
    return r.data;
}
function getLinksData(results) {
    const r = results.links;
    if (!r || "error" in r)
        return null;
    return r.data;
}
function getSpeedData(results) {
    const r = results.speed;
    if (!r || "error" in r)
        return null;
    return r.data;
}
function getAltData(results) {
    const r = results.alt;
    if (!r || "error" in r)
        return null;
    return r.data;
}
function getSiteConfigData(results) {
    const r = results.siteConfig;
    if (!r || "error" in r)
        return null;
    return r.data;
}
function toolError(toolName) {
    return { status: "error", detail: `${toolName}のデータ取得に失敗` };
}
// ---- Shared evaluation functions ----
function evalMetaTitle(results) {
    const ogp = getOgpData(results);
    if (!ogp)
        return toolError("OGPチェッカー");
    const title = ogp.ogp.title;
    if (!title)
        return { status: "fail", detail: "タイトルタグが未設定" };
    const len = title.length;
    const titlePreview = title.length > 60 ? title.slice(0, 57) + "..." : title;
    if (len >= 30 && len <= 60)
        return { status: "pass", detail: `"${titlePreview}"（${len}文字、適切）` };
    if (len < 30)
        return { status: "warn", detail: `"${titlePreview}"（${len}文字、短い。推奨: 30〜60文字）` };
    return { status: "warn", detail: `"${titlePreview}"（${len}文字、長い。推奨: 30〜60文字）` };
}
function evalMetaDescription(results) {
    const ogp = getOgpData(results);
    if (!ogp)
        return toolError("OGPチェッカー");
    const desc = ogp.ogp.description;
    if (!desc)
        return { status: "fail", detail: "メタディスクリプションが未設定" };
    const len = desc.length;
    const descPreview = desc.length > 80 ? desc.slice(0, 77) + "..." : desc;
    if (len >= 80 && len <= 160)
        return { status: "pass", detail: `"${descPreview}"（${len}文字、適切）` };
    if (len < 80)
        return {
            status: "warn",
            detail: `"${descPreview}"（${len}文字、短い。推奨: 80〜160文字）`,
        };
    return {
        status: "warn",
        detail: `"${descPreview}"（${len}文字、長い。推奨: 80〜160文字）`,
    };
}
function evalOgpImage(results) {
    const ogp = getOgpData(results);
    if (!ogp)
        return toolError("OGPチェッカー");
    if (ogp.ogp.image)
        return { status: "pass", detail: `OGP画像が設定済み: ${ogp.ogp.image}` };
    return { status: "fail", detail: "OGP画像が未設定" };
}
function evalTwitterCard(results) {
    const ogp = getOgpData(results);
    if (!ogp)
        return toolError("OGPチェッカー");
    if (ogp.twitter.card)
        return {
            status: "pass",
            detail: `twitter:card = "${ogp.twitter.card}"`,
        };
    return { status: "fail", detail: "twitter:card メタタグが未設定" };
}
function evalTwitterImage(results) {
    const ogp = getOgpData(results);
    if (!ogp)
        return toolError("OGPチェッカー");
    const imgUrl = ogp.twitter.image || ogp.ogp.image;
    if (imgUrl)
        return { status: "pass", detail: `Twitter Card画像が設定済み: ${imgUrl}` };
    return { status: "fail", detail: "Twitter Card画像が未設定" };
}
function evalH1Unique(results) {
    const headings = getHeadingsData(results);
    if (!headings)
        return toolError("見出し抽出ツール");
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
function evalHeadingHierarchy(results) {
    const headings = getHeadingsData(results);
    if (!headings)
        return toolError("見出し抽出ツール");
    if (headings.headings.length === 0)
        return { status: "warn", detail: "見出しが1つもありません" };
    let prevLevel = 0;
    const issues = [];
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
function evalAltAttributes(results) {
    const alt = getAltData(results);
    if (!alt)
        return toolError("alt属性チェッカー");
    if (alt.summary.total === 0)
        return { status: "pass", detail: "画像なし" };
    if (alt.summary.missingAlt === 0)
        return {
            status: "pass",
            detail: `全${alt.summary.total}画像にalt設定済み`,
        };
    // Include specific image URLs that are missing alt for actionable feedback
    const missingImages = alt.images
        .filter((img) => img.context === "missing")
        .slice(0, 3)
        .map((img) => img.src);
    const missingInfo = missingImages.length > 0
        ? `: ${missingImages.join("、")}${alt.summary.missingAlt > 3 ? ` 他${alt.summary.missingAlt - 3}件` : ""}`
        : "";
    return {
        status: "fail",
        detail: `${alt.summary.missingAlt}件のalt未設定（全${alt.summary.total}画像中）${missingInfo}`,
    };
}
function evalNoBrokenLinks(results) {
    const links = getLinksData(results);
    if (!links)
        return toolError("リンク切れチェッカー");
    // Distinguish truly broken links from bot-blocked domains (e.g. X/Twitter 403)
    // Site API sets `warning` field for known blocked domains (x.com, twitter.com, etc.)
    const trulyBroken = links.links.filter((l) => l.status >= 400 && !l.warning);
    const botBlocked = links.links.filter((l) => l.status >= 400 && !!l.warning);
    if (trulyBroken.length === 0 && botBlocked.length === 0) {
        return {
            status: "pass",
            detail: `${links.totalLinks}リンク全て正常`,
        };
    }
    // Build detail with specific URLs
    const parts = [];
    if (trulyBroken.length > 0) {
        const urls = trulyBroken
            .slice(0, 3)
            .map((l) => `${l.url}（${l.status}）`)
            .join("、");
        parts.push(`${trulyBroken.length}件のリンク切れ: ${urls}${trulyBroken.length > 3 ? ` 他${trulyBroken.length - 3}件` : ""}`);
    }
    if (botBlocked.length > 0) {
        const urls = botBlocked
            .slice(0, 2)
            .map((l) => l.url)
            .join("、");
        parts.push(`${botBlocked.length}件はボットブロック（${urls}）— ブラウザで直接確認してください`);
    }
    // Only truly broken links are "fail"; bot-blocked only is "warn"
    if (trulyBroken.length > 0) {
        return {
            status: "fail",
            detail: parts.join("。") + `（全${links.totalLinks}リンク中）`,
        };
    }
    return {
        status: "warn",
        detail: parts.join("。") + `（全${links.totalLinks}リンク中）`,
    };
}
function evalPerformanceScore(results) {
    const speed = getSpeedData(results);
    if (!speed)
        return toolError("ページ速度チェッカー");
    const score = speed.performanceScore;
    // Include top opportunity for actionable feedback
    const topOpportunity = speed.opportunities.length > 0
        ? `。改善提案: ${speed.opportunities[0].title}（${speed.opportunities[0].savings}）`
        : "";
    if (score >= 90)
        return { status: "pass", detail: `${score}点（優秀）` };
    if (score >= 50)
        return { status: "warn", detail: `${score}点（改善余地あり）${topOpportunity}` };
    return { status: "fail", detail: `${score}点（要改善、50点未満）${topOpportunity}` };
}
function evalLCP(results) {
    const speed = getSpeedData(results);
    if (!speed)
        return toolError("ページ速度チェッカー");
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
function evalCLS(results) {
    const speed = getSpeedData(results);
    if (!speed)
        return toolError("ページ速度チェッカー");
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
function evalCanonical(results) {
    const ogp = getOgpData(results);
    if (!ogp)
        return toolError("OGPチェッカー");
    if (ogp.canonical) {
        return { status: "pass", detail: `canonical URL: ${ogp.canonical}` };
    }
    return { status: "fail", detail: "canonical URLが未設定（<link rel=\"canonical\"> が見つかりません）" };
}
function evalJsonLd(results) {
    const ogp = getOgpData(results);
    if (!ogp)
        return toolError("OGPチェッカー");
    if (!ogp.jsonLd || ogp.jsonLd.length === 0) {
        return { status: "fail", detail: "JSON-LD構造化データが未設定（<script type=\"application/ld+json\"> が見つかりません）" };
    }
    const validItems = ogp.jsonLd.filter((item) => item.valid);
    const invalidItems = ogp.jsonLd.filter((item) => !item.valid);
    const types = validItems.map((item) => item.type).join(", ");
    if (invalidItems.length > 0) {
        return {
            status: "warn",
            detail: `JSON-LD ${ogp.jsonLd.length}件中${invalidItems.length}件が不正。有効: ${types || "なし"}`,
        };
    }
    return { status: "pass", detail: `JSON-LD ${validItems.length}件: ${types}` };
}
function evalRobotsTxt(results) {
    const siteConfig = getSiteConfigData(results);
    if (!siteConfig)
        return toolError("サイト設定チェッカー");
    if (!siteConfig.robots.exists) {
        return { status: "fail", detail: "robots.txt が見つかりません" };
    }
    if (siteConfig.robots.issues.length > 0) {
        return {
            status: "warn",
            detail: `robots.txt にissueあり: ${siteConfig.robots.issues.slice(0, 2).join("、")}${siteConfig.robots.issues.length > 2 ? ` 他${siteConfig.robots.issues.length - 2}件` : ""}（ルール${siteConfig.robots.rules}件）`,
        };
    }
    const sitemapInfo = siteConfig.robots.hasSitemapDirective
        ? `、Sitemapディレクティブあり（${siteConfig.robots.sitemapUrls[0]}）`
        : "";
    return { status: "pass", detail: `robots.txt 正常（ルール${siteConfig.robots.rules}件${sitemapInfo}）` };
}
function evalSitemap(results) {
    const siteConfig = getSiteConfigData(results);
    if (!siteConfig)
        return toolError("サイト設定チェッカー");
    if (!siteConfig.sitemap.exists) {
        return { status: "fail", detail: `XMLサイトマップが見つかりません（${siteConfig.sitemap.url || "検出不可"}）` };
    }
    if (siteConfig.sitemap.urlCount === 0) {
        return { status: "warn", detail: `サイトマップにURLが含まれていません（${siteConfig.sitemap.url}）` };
    }
    if (siteConfig.sitemap.issues.length > 0) {
        return {
            status: "warn",
            detail: `サイトマップにissueあり: ${siteConfig.sitemap.issues.slice(0, 2).join("、")}（${siteConfig.sitemap.urlCount} URL）`,
        };
    }
    const indexInfo = siteConfig.sitemap.isIndex ? "（サイトマップインデックス）" : "";
    return { status: "pass", detail: `サイトマップ正常: ${siteConfig.sitemap.urlCount} URL${indexInfo}（${siteConfig.sitemap.url}）` };
}
function evalMetaTitleExists(results) {
    const ogp = getOgpData(results);
    if (!ogp)
        return toolError("OGPチェッカー");
    if (ogp.ogp.title) {
        const titlePreview = ogp.ogp.title.length > 60 ? ogp.ogp.title.slice(0, 57) + "..." : ogp.ogp.title;
        return { status: "pass", detail: `"${titlePreview}"（${ogp.ogp.title.length}文字）` };
    }
    return { status: "fail", detail: "タイトルタグが未設定" };
}
function evalH1Exists(results) {
    const headings = getHeadingsData(results);
    if (!headings)
        return toolError("見出し抽出ツール");
    const h1s = headings.headings.filter((h) => h.level === 1);
    if (h1s.length > 0)
        return { status: "pass", detail: `H1: "${h1s[0].text}"` };
    return { status: "fail", detail: "H1タグが存在しません" };
}
// ---- SEO Audit Checklist ----
export const seoAuditChecklist = [
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
        autoVerifiable: true,
        tier1Tool: "ogp",
        evaluate: evalCanonical,
    },
    // 構造化データ
    {
        id: "seo-jsonld",
        category: "構造化データ",
        label: "JSON-LD構造化データが設定されているか",
        weight: 5,
        autoVerifiable: true,
        tier1Tool: "ogp",
        evaluate: evalJsonLd,
    },
    // クローラビリティ
    {
        id: "seo-robots-txt",
        category: "クローラビリティ",
        label: "robots.txtが適切に設定されているか",
        weight: 5,
        autoVerifiable: true,
        tier1Tool: "siteConfig",
        evaluate: evalRobotsTxt,
    },
    {
        id: "seo-sitemap",
        category: "クローラビリティ",
        label: "XMLサイトマップが生成・送信されているか",
        weight: 5,
        autoVerifiable: true,
        tier1Tool: "siteConfig",
        evaluate: evalSitemap,
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
export const webLaunchAuditChecklist = [
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
        autoVerifiable: true,
        tier1Tool: "siteConfig",
        evaluate: evalRobotsTxt,
    },
    {
        id: "wl-sitemap",
        category: "SEO",
        label: "サイトマップXMLが生成されているか",
        weight: 5,
        autoVerifiable: true,
        tier1Tool: "siteConfig",
        evaluate: evalSitemap,
    },
    {
        id: "wl-jsonld",
        category: "SEO",
        label: "構造化データ（JSON-LD）を設定しているか",
        weight: 5,
        autoVerifiable: true,
        tier1Tool: "ogp",
        evaluate: evalJsonLd,
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
export const freelanceDeliveryAuditChecklist = [
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
//# sourceMappingURL=checklist-data.js.map