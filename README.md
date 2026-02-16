# ZERONOVA LAB MCP Server

MCP Server for [ZERONOVA LAB](https://zeronova-lab.com) tools — SEO audit, link checking, OGP validation, and more for AI agents.

## Features

### Tier 1: Individual Tools (6 tools)

Single-purpose API wrappers for web page analysis:

| Tool | Description |
|------|-------------|
| `check_alt_attributes` | Check alt attributes of all images on a webpage |
| `check_links` | Check all links on a webpage for broken URLs |
| `check_page_speed` | Analyze webpage performance using PageSpeed Insights |
| `check_ogp` | Check OGP and Twitter Card meta tags |
| `extract_headings` | Extract H1-H6 heading hierarchy |
| `check_x_card` | Check X (Twitter) Card settings and validation |

### Tier 2: Workflow Tools (3 tools)

"Workflow as a Tool" — chain multiple Tier 1 tools in a single call for comprehensive audits:

| Tool | Description |
|------|-------------|
| `run_seo_audit` | Comprehensive SEO audit with scoring (0-100). Chains OGP, heading, link, speed, and alt checks into a unified report. |
| `run_web_launch_audit` | Pre-launch quality audit. SEO, performance, link integrity, accessibility, and branding checks. |
| `run_freelance_delivery_audit` | Pre-delivery audit for freelance projects. Quality, SEO, and manual checklist items. |

**Workflow features:**
- Checklist-driven evaluation with weighted scoring (pass = full weight, warn = half, fail = 0)
- Partial failure resilience — individual tool failures don't stop the workflow
- Progress reporting via MCP `notifications/progress` protocol
- Manual check items for non-automatable verification (robots.txt, JSON-LD, contrast, etc.)

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

Analyze webpage performance using Google PageSpeed Insights.

**Parameters:**
- `url` (required): Target webpage URL
- `strategy` (optional): `"mobile"` or `"desktop"` (default: `"mobile"`)

**Returns:** Performance score (0-100), Core Web Vitals (FCP, LCP, TBT, CLS, SI, TTI), and top optimization opportunities.

#### check_ogp

Check Open Graph Protocol and Twitter Card meta tags.

**Parameters:**
- `url` (required): Target webpage URL

**Returns:** OGP data (title, description, image, url, type, siteName) and Twitter Card data with fallback chain resolution.

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

### Tier 2 Tools

#### run_seo_audit

Comprehensive SEO audit that chains multiple checks into a unified report with scoring.

**Parameters:**
- `url` (required): Target webpage URL

**Returns:** Audit report with:
- Checklist results (16 items): OGP title/description/image, H1 uniqueness, heading hierarchy, broken links, page speed, alt attributes, and more
- Weighted score (0-100)
- Manual check items: robots.txt, JSON-LD, mobile-friendly, canonical URL

#### run_web_launch_audit

Pre-launch quality audit for websites about to go live.

**Parameters:**
- `url` (required): Target webpage URL

**Returns:** Audit report with:
- Checklist results (18 items): All SEO checks plus X Card, favicons, error pages, branding consistency
- Weighted score (0-100)
- Manual check items: favicon, 404 page, form validation, analytics, contrast ratio

#### run_freelance_delivery_audit

Pre-delivery audit for freelance web projects.

**Parameters:**
- `url` (required): Target webpage URL

**Returns:** Audit report with:
- Checklist results (13 items): Core SEO, alt attributes, page speed, broken links
- Weighted score (0-100)
- Manual check items: cross-browser testing, copyright year, SSL, contact form

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

- **SSRF Protection**: URLs are validated for protocol (http/https only) and private IP ranges (localhost, 127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16) are blocked.
- **Rate Limiting**: Each tool is limited to **10 requests per minute** locally. The ZERONOVA LAB API also enforces its own rate limits.
- **Response Validation**: All API responses are validated against Zod schemas to detect format changes early.
- **Error Sanitization**: Internal paths and API URLs are never exposed in error messages.

## Requirements

- Node.js >= 18.0.0

## License

MIT
