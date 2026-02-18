# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2026-02-18

### Added

- 5 Tier 3 config file generation tools ("Config as a Tool" — AI agents can safely generate validated config files):
  - `generate_robots_txt` — Generate valid robots.txt from structured input (sitemap URL, disallow/allow paths, user-agent, crawl-delay). Output validation ensures only valid directives. Path sanitization removes control characters.
  - `generate_sitemap_xml` — Generate valid XML sitemap from URL list (up to 50,000 entries with optional lastmod, changefreq, priority). XML special characters safely escaped as entities. Validates URL format, date format, changefreq values, and priority range.
  - `generate_htaccess` — Generate valid Apache .htaccess with redirect rules (301/302/307/308), gzip compression, cache control, force HTTPS, and trailing slash removal. Injection prevention: blocks backtick execution, `$()` substitution, `%{ENV:}` injection, newline injection, and null bytes in RewriteRule patterns.
  - `generate_jsonld` — Generate Schema.org-compliant JSON-LD structured data supporting 16 schema types. Uses JSON.stringify for safe serialization. Validates required fields per type. Returns both raw JSON and `<script>` tag with XSS prevention.
  - `generate_meta_tags` — Generate SEO-optimized HTML meta tags (title, description, keywords, OGP, Twitter Card, canonical URL, robots). HTML attribute escaping prevents injection. Includes SEO analysis with title/description length status.
- All Tier 3 tools follow mcp-dev-checklist.md section 2-D: output validation, injection prevention, no browser-dependent APIs, runtime input validation, rate limiting, error handling

## [0.3.0] - 2026-02-18

### Added

- New Tier 1 tool: `check_security_headers` — checks 6 HTTP security headers (HSTS, CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy) with pass/warn/fail status and overall security score (0-100)
- OGP checker (`check_ogp`) now returns `favicon` data: `<link>` icon tags (rel, href, type, sizes), apple-touch-icon detection, and `/favicon.ico` existence check
- Speed checker (`check_page_speed`) now returns `accessibility` data: accessibility score and color-contrast violations (snippet + explanation, up to 10 items)
- 6 checklist items converted from manual to auto-verified across Tier 2 workflows:
  - **Web Launch Audit**: color contrast (via speed checker accessibility), favicon (via OGP checker favicon), security headers (replaces admin password check)
  - **Freelance Delivery Audit**: color contrast, favicon, security headers (replaces admin password check)
- Web launch audit now runs 7 Tier 1 tools (was 6) — 17 auto-verified + 1 manual item (was 14 auto + 4 manual)
- Freelance delivery audit now runs 7 Tier 1 tools — 10 auto-verified + 3 manual items (was 7 auto + 6 manual)
- Zod response schemas added: `accessibilityResultSchema`, `contrastViolationSchema`, `faviconResultSchema`, `faviconItemSchema`, `securityHeadersCheckerResponseSchema`
- New evaluation functions: `evalFavicon()`, `evalColorContrast()`, `evalSecurityHeaders()`

## [0.2.2] - 2026-02-17

### Fixed

- SSRF: site-config-checker API route changed from `redirect: "follow"` to `redirect: "manual"` with per-hop `isValidUrl()` validation
- OGP result summary now includes `canonical` URL and `jsonLd` items (type + validity) in `buildToolResultSummary()`
- Site config result summary now includes `robots.content` (actual robots.txt text) in `buildToolResultSummary()`
- McpServer version and User-Agent now match package.json (`0.2.2`)
- Tool descriptions updated: `check_ogp` mentions canonical/JSON-LD, `run_web_launch_audit` mentions 6 tools
- JSDoc corrected: seo-audit handler documents 6 Tier 1 tools (was 5)
- README.md updated: Tier 1 tool count (6→7), `check_site_config` added, Tier 2 auto/manual item counts corrected

## [0.2.1] - 2026-02-16

### Added

- New Tier 1 tool: `check_site_config` — checks robots.txt syntax/rules and XML sitemap structure/URL count for a website
- OGP checker (`check_ogp`) now returns `canonical` URL and `jsonLd` structured data items
- 7 SEO audit checklist items converted from manual to auto-verified:
  - canonical URL (via OGP checker)
  - JSON-LD structured data (via OGP checker)
  - robots.txt validation (via site config checker)
  - XML sitemap validation (via site config checker)
  - robots.txt in web-launch-audit
  - sitemap in web-launch-audit
  - JSON-LD in web-launch-audit
- SEO audit now runs 6 Tier 1 tools (was 5) — all 16 checklist items are auto-verified (0 manual)
- Web launch audit now runs 6 Tier 1 tools — 14 auto-verified + 4 manual items

### Fixed

- Workflow output information parity: `buildToolResultSummary()` now includes all fields from site-side tools (OGP title/description/image/type/siteName, Speed 6 metrics + top 5 opportunities, Alt missing image URLs up to 10, Headings full list + hierarchy skip info, Links text + internal/external classification)
- Checklist evaluation details now include actual data (real title/description text, image URLs, top improvement suggestions)
- Link check evaluation now distinguishes bot-blocked (403) from true broken links using the API's `warning` field — bot-blocked URLs are reported as "warn" instead of "fail"
- Added tests for bot-blocked only and mixed (broken + bot-blocked) scenarios

## [0.2.0] - 2026-02-16

### Added

- 3 Tier 2 workflow tools ("Workflow as a Tool" — chain multiple Tier 1 tools in a single call):
  - `run_seo_audit` — Comprehensive SEO audit: chains OGP, heading, link, speed, and alt checks into a unified report with scoring (0-100)
  - `run_web_launch_audit` — Pre-launch quality audit: SEO, performance, link integrity, accessibility, branding checks
  - `run_freelance_delivery_audit` — Pre-delivery audit for freelance projects: quality, SEO, and manual checklist items
- Checklist-driven evaluation: each workflow defines checklist items with auto-verifiable evaluation functions
- Weighted scoring: pass = full weight, warn = half weight, fail = 0
- Partial failure resilience: individual tool failures do not stop the workflow (reported as "error" status)
- Workflow timeout: 60-second limit enforced via `Promise.race` during tool execution
- Manual check items: non-automatable items (contrast, favicon, etc.) listed as "manual" for human/AI review
- Progress reporting via MCP SDK `notifications/progress` protocol (with stderr fallback)
- Score calculation excludes error items from maxScore ("未評価" — unevaluated items)
- New types: `AuditReport`, `CheckItemDefinition`, `CheckItemResult`, `CollectedToolResults`, etc.

## [0.1.0] - 2026-02-16

### Added

- Initial release with 6 Tier 1 tools (API wrappers):
  - `check_alt_attributes` — Check alt attributes of all images on a webpage
  - `check_links` — Check all links on a webpage for broken URLs
  - `check_page_speed` — Analyze webpage performance via Google PageSpeed Insights
  - `check_ogp` — Check OGP and Twitter Card meta tags
  - `extract_headings` — Extract heading hierarchy (H1-H6)
  - `check_x_card` — Validate X (Twitter) Card settings with OGP fallback
- SSRF protection: protocol validation + private IP / localhost blocking
- Rate limiting: 10 requests per minute per tool (sliding window)
- API response schema validation with Zod
- Retry logic: 1 retry with 2s wait on network/server errors
- Configurable API base URL via `ZERONOVA_API_URL` environment variable
