# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
