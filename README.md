# ZERONOVA LAB MCP Server

MCP Server for [ZERONOVA LAB](https://zeronova-lab.com) tools — SEO audit, link checking, OGP validation, and more for AI agents.

## Features

### Tier 1: Individual Tools (8 tools)

Single-purpose API wrappers for web page analysis:

| Tool | Description |
|------|-------------|
| `check_alt_attributes` | Check alt attributes of all images on a webpage |
| `check_links` | Check all links on a webpage for broken URLs |
| `check_page_speed` | Analyze webpage performance and accessibility using PageSpeed Insights |
| `check_ogp` | Check OGP, Twitter Card meta tags, canonical URL, JSON-LD, and favicon |
| `extract_headings` | Extract H1-H6 heading hierarchy |
| `check_x_card` | Check X (Twitter) Card settings and validation |
| `check_site_config` | Check robots.txt and XML sitemap configuration |
| `check_security_headers` | Check 6 HTTP security headers (HSTS, CSP, etc.) with scoring |

### Tier 2: Workflow Tools (3 tools)

"Workflow as a Tool" — chain multiple Tier 1 tools in a single call for comprehensive audits:

| Tool | Description |
|------|-------------|
| `run_seo_audit` | Comprehensive SEO audit with scoring (0-100). Chains 6 tools (OGP, heading, link, speed, alt, site config) into a unified report with 16 auto-verified items. |
| `run_web_launch_audit` | Pre-launch quality audit. Chains 7 tools (OGP, heading, link, speed, alt, site config, security headers) for SEO, performance, accessibility, and branding checks (17 auto + 1 manual items). |
| `run_freelance_delivery_audit` | Pre-delivery audit for freelance projects. Chains 7 tools for quality, SEO, accessibility, and security checks (10 auto + 3 manual items). |

**Workflow features:**
- Checklist-driven evaluation with weighted scoring (pass = full weight, warn = half, fail = 0)
- Partial failure resilience — individual tool failures don't stop the workflow
- Progress reporting via MCP `notifications/progress` protocol
- Bot-blocked links (e.g. X/Twitter 403) are distinguished from true broken links

## Installation

### Claude Code

Add to your Claude Code settings:

```json
{
  "mcpServers": {
    "zeronova-lab": {
      "command": "npx",
      "args": ["-y", "zeronova-lab-mcp"]
    }
  }
}
```

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "zeronova-lab": {
      "command": "npx",
      "args": ["-y", "zeronova-lab-mcp"]
    }
  }
}
```

### Manual

```bash
# Run directly
npx zeronova-lab-mcp

# Or install globally
npm install -g zeronova-lab-mcp
zeronova-lab-mcp
```

## Tool Details

### Tier 1 Tools

#### check_alt_attributes

Check alt attributes of all images on a webpage.

**Parameters:**
- `url` (required): Target webpage URL

**Returns:** List of images with alt attribute status (present/empty/missing/decorative) and summary counts.

#### check_links

Check all links on a webpage for broken URLs.

**Parameters:**
- `url` (required): Target webpage URL

**Returns:** List of links with HTTP status codes, external/internal classification, and warnings for known blocking domains.

#### check_page_speed

Analyze webpage performance and accessibility using Google PageSpeed Insights.

**Parameters:**
- `url` (required): Target webpage URL
- `strategy` (optional): `"mobile"` or `"desktop"` (default: `"mobile"`)

**Returns:** Performance score (0-100), Core Web Vitals (FCP, LCP, TBT, CLS, SI, TTI), top optimization opportunities, accessibility score, and color-contrast violations (snippet + explanation, up to 10 items).

#### check_ogp

Check Open Graph Protocol, Twitter Card meta tags, canonical URL, JSON-LD structured data, and favicon.

**Parameters:**
- `url` (required): Target webpage URL

**Returns:** OGP data (title, description, image, url, type, siteName), Twitter Card data with fallback chain resolution, canonical URL (`<link rel="canonical">`), JSON-LD items (type, validity, raw content), and favicon data (icon tags, apple-touch-icon detection, `/favicon.ico` existence check).

#### extract_headings

Extract all headings (H1-H6) from a webpage.

**Parameters:**
- `url` (required): Target webpage URL

**Returns:** Heading hierarchy with level and text for each heading.

#### check_x_card

Check X (Twitter) Card settings for a webpage.

**Parameters:**
- `url` (required): Target webpage URL

**Returns:** Card data, validation results with specific issues, and OGP fallback values.

#### check_site_config

Check robots.txt and XML sitemap configuration for a website.

**Parameters:**
- `url` (required): Target webpage URL (domain is extracted automatically)

**Returns:** robots.txt status (exists, content, rules count, Sitemap directives, issues) and sitemap.xml status (exists, URL count, sitemap index detection, issues).

#### check_security_headers

Check HTTP security headers for a website.

**Parameters:**
- `url` (required): Target webpage URL

**Returns:** 6 security headers (Strict-Transport-Security, Content-Security-Policy, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy) with pass/warn/fail status, header values, and overall security score (0-100).

### Tier 2 Tools

#### run_seo_audit

Comprehensive SEO audit that chains 6 tools into a unified report with scoring.

**Parameters:**
- `url` (required): Target webpage URL

**Returns:** Audit report with:
- 16 auto-verified checklist items: meta title/description, canonical URL, JSON-LD, robots.txt, XML sitemap, H1 uniqueness, heading hierarchy, alt attributes, performance score, LCP, CLS, OGP image, Twitter Card/image, broken links
- Weighted score (0-100)

#### run_web_launch_audit

Pre-launch quality audit for websites about to go live. Chains 7 Tier 1 tools (OGP, heading, link, speed, alt, site config, security headers).

**Parameters:**
- `url` (required): Target webpage URL

**Returns:** Audit report with:
- 17 auto-verified checklist items: meta tags, OGP, Twitter Card, heading structure, robots.txt, sitemap, JSON-LD, performance, LCP, CLS, broken links, alt attributes, color contrast, favicon, security headers
- 1 manual check item: OGP brand design
- Weighted score (0-100)

#### run_freelance_delivery_audit

Pre-delivery audit for freelance web projects. Chains 7 Tier 1 tools (OGP, heading, link, speed, alt, site config, security headers).

**Parameters:**
- `url` (required): Target webpage URL

**Returns:** Audit report with:
- 10 auto-verified checklist items: broken links, page speed, alt attributes, H1, meta title, meta description, OGP image, color contrast, favicon, security headers
- 3 manual check items: proofreading, invoice, pricing
- Weighted score (0-100)

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ZERONOVA_API_URL` | `https://zeronova-lab.com` | API base URL. Set to `http://localhost:3000` for local development. |

Example with custom API URL:

```json
{
  "mcpServers": {
    "zeronova-lab": {
      "command": "npx",
      "args": ["-y", "zeronova-lab-mcp"],
      "env": {
        "ZERONOVA_API_URL": "http://localhost:3000"
      }
    }
  }
}
```

## Security

- **SSRF Protection**: URLs are validated for protocol (http/https only) and private IP ranges (localhost, 127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16) are blocked. API routes use `redirect: "manual"` with per-hop validation.
- **Rate Limiting**: Each tool is limited to **10 requests per minute** locally. The ZERONOVA LAB API also enforces its own rate limits.
- **Response Validation**: All API responses are validated against Zod schemas to detect format changes early.
- **Error Sanitization**: Internal paths and API URLs are never exposed in error messages.

## Requirements

- Node.js >= 18.0.0

## License

MIT
