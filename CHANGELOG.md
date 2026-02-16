# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
- Manual check items: non-automatable items (robots.txt, JSON-LD, contrast, etc.) listed as "manual" for human/AI review
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
