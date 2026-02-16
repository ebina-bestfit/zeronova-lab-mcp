# CLAUDE.md - ZERONOVA LAB MCP Server

## Project Overview

MCP Server that wraps ZERONOVA LAB's web analysis API routes. Exposes tools for AI agents via the Model Context Protocol.

- **npm package**: `zeronova-lab-mcp`
- **MCP SDK**: `@modelcontextprotocol/sdk`
- **Language**: TypeScript (ESM)
- **Test**: vitest

## Architecture

```
zeronova-lab-mcp/
├── src/
│   ├── index.ts              # MCP Server entry point (tool registration)
│   ├── client.ts             # HTTP client for ZERONOVA LAB API
│   ├── rate-limiter.ts       # Local rate limiting (10 req/min per tool)
│   ├── types.ts              # API response type definitions
│   └── tools/
│       └── tier1/            # Tier 1: API wrapper tools
│           ├── alt-checker.ts
│           ├── link-checker.ts
│           ├── speed-checker.ts
│           ├── ogp-checker.ts
│           ├── heading-extractor.ts
│           └── x-card-preview.ts
├── package.json
├── tsconfig.json
└── README.md
```

## Development Commands

```bash
npm run build        # TypeScript compilation
npm run dev          # Watch mode
npm run typecheck    # Type check only
npm run test         # Run tests
npm start            # Start MCP Server
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ZERONOVA_API_URL` | `https://zeronova-lab.com` | API base URL override (dev: `http://localhost:3000`) |

## Security Features

- **SSRF**: `validateUrl()` in `index.ts` blocks private IPs, localhost, link-local
- **Rate limiting**: `RateLimiter` class, 10 req/min per tool
- **Response validation**: Zod schemas in `client.ts` validate all API responses
- **Error sanitization**: `formatError()` strips internal paths/URLs
- **Timeout**: 15s per Tier 1 tool, with 1 retry on network/server errors
- **User-Agent**: `ZeronovaLabMCP/0.1.0`

## API Reference (ZERONOVA LAB)

All Tier 1 tools call `${ZERONOVA_API_URL}/api/tools/*` via HTTP GET (default: `https://zeronova-lab.com/api/tools/*`).

### Endpoints

| Endpoint | Parameters | Response Key Fields |
|----------|-----------|-------------------|
| `/api/tools/alt-checker?url=` | `url` | `images[]`, `summary.total/withAlt/emptyAlt/missingAlt/decorative` |
| `/api/tools/link-checker?url=` | `url` | `links[].url/status/statusText/isExternal/warning`, `totalLinks` |
| `/api/tools/speed-checker?url=&strategy=` | `url`, `strategy` (mobile/desktop) | `performanceScore`, `metrics.fcp/lcp/tbt/cls/si/tti`, `opportunities[]` |
| `/api/tools/ogp-checker?url=` | `url` | `ogp.title/description/image/url/type/siteName`, `twitter.card/title/description/image` |
| `/api/tools/heading-extractor?url=` | `url` | `headings[].level/text`, `title` |

### Common Behaviors

- All endpoints validate URL with `isValidUrl()` (blocks private IPs, localhost, cloud metadata)
- Manual redirect following with SSRF validation at each hop (max 5 redirects)
- Content-Type check (HTML/XML/XHTML only)
- 1MB response size limit
- 10-second timeout (30 seconds for speed-checker)
- Rate limited: 10 calls/minute per IP (middleware)
- Error responses: `{ "error": "message" }` with appropriate HTTP status

### x-card-preview

No separate API endpoint exists. The `check_x_card` tool calls the ogp-checker API and adds validation logic locally.

## Coding Conventions

- TypeScript strict mode
- ESM (`"type": "module"`)
- No `any` types
- Named exports
- Async functions for all API calls
- Error handling: catch and return `isError: true` responses (never crash the server)

## Future Phases

- **Phase 2 (Tier 2)**: Workflow tools (`run_seo_audit`, `run_web_launch_audit`, `run_freelance_delivery_audit`) — chain Tier 1 tools internally
- **Phase 3 (Tier 3)**: Config generators (robots.txt, sitemap.xml, .htaccess, JSON-LD, meta tags)
- **Phase 4 (Tier 4)**: Document workflows (EPUB creation + validation)
