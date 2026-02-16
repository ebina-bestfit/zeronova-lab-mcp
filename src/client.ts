import { z } from "zod";
import type {
  AltCheckerResponse,
  LinkCheckerResponse,
  SpeedCheckerResponse,
  OgpCheckerResponse,
  HeadingExtractorResponse,
} from "./types.js";

// Checklist 2-B: API base URL configurable via ZERONOVA_API_URL env var
const DEFAULT_BASE_URL = "https://zeronova-lab.com/api/tools";
const BASE_URL = process.env.ZERONOVA_API_URL
  ? `${process.env.ZERONOVA_API_URL.replace(/\/$/, "")}/api/tools`
  : DEFAULT_BASE_URL;

// Checklist 2-A: Tier 1 timeout = 15 seconds
const REQUEST_TIMEOUT_MS = 15_000;

// Checklist 2-A: 1 retry with 2s wait on network/server error
const RETRY_DELAY_MS = 2_000;

// Checklist 2-B: User-Agent format = ZeronovaLabMCP/{version}
const USER_AGENT = "ZeronovaLabMCP/0.2.0";

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.statusCode >= 500 || error.statusCode === 408;
  }
  if (error instanceof Error) {
    return (
      error.name === "AbortError" ||
      error.message.includes("fetch failed") ||
      error.message.includes("ECONNREFUSED") ||
      error.message.includes("ENOTFOUND") ||
      error.message.includes("ETIMEDOUT")
    );
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchApiOnce<T>(
  endpoint: string,
  params: Record<string, string>,
): Promise<T> {
  const url = new URL(`${BASE_URL}/${endpoint}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      let message: string;
      try {
        const json = JSON.parse(body) as { error?: string };
        message = json.error ?? body;
      } catch {
        message = body;
      }
      throw new ApiError(response.status, message);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError(
        408,
        `Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`,
      );
    }
    throw new ApiError(
      500,
      error instanceof Error ? error.message : "Unknown error",
    );
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Fetch API with retry logic.
 * Checklist 2-A: 1 retry with 2s wait on network/server error.
 * 2 failures total → error returned (no infinite retry).
 */
async function fetchApi<T>(
  endpoint: string,
  params: Record<string, string>,
): Promise<T> {
  try {
    return await fetchApiOnce<T>(endpoint, params);
  } catch (error) {
    if (isRetryableError(error)) {
      await sleep(RETRY_DELAY_MS);
      return fetchApiOnce<T>(endpoint, params);
    }
    throw error;
  }
}

// ---- Zod response schemas for runtime validation (checklist 2-B) ----

const altCheckerImageSchema = z.object({
  src: z.string(),
  alt: z.union([z.string(), z.null()]),
  hasAlt: z.boolean(),
  width: z.union([z.string(), z.null()]),
  height: z.union([z.string(), z.null()]),
  isDecorative: z.boolean(),
  context: z.enum(["present", "empty", "missing", "decorative"]),
});

const altCheckerResponseSchema = z.object({
  images: z.array(altCheckerImageSchema),
  title: z.string(),
  url: z.string(),
  summary: z.object({
    total: z.number(),
    withAlt: z.number(),
    emptyAlt: z.number(),
    missingAlt: z.number(),
    decorative: z.number(),
  }),
});

const linkCheckerResponseSchema = z.object({
  links: z.array(
    z.object({
      url: z.string(),
      text: z.string(),
      status: z.number(),
      statusText: z.string(),
      isExternal: z.boolean(),
      warning: z.string().optional(),
    }),
  ),
  title: z.string(),
  checkedUrl: z.string(),
  totalLinks: z.number(),
});

const speedMetricSchema = z.object({
  score: z.number(),
  value: z.string(),
  displayValue: z.string(),
});

const speedCheckerResponseSchema = z.object({
  url: z.string(),
  strategy: z.enum(["mobile", "desktop"]),
  performanceScore: z.number(),
  metrics: z.object({
    fcp: speedMetricSchema,
    lcp: speedMetricSchema,
    tbt: speedMetricSchema,
    cls: speedMetricSchema,
    si: speedMetricSchema,
    tti: speedMetricSchema,
  }),
  opportunities: z.array(
    z.object({
      title: z.string(),
      savings: z.string(),
    }),
  ),
  fetchedAt: z.string(),
});

const ogpCheckerResponseSchema = z.object({
  ogp: z.object({
    title: z.string(),
    description: z.string(),
    image: z.string(),
    url: z.string(),
    type: z.string(),
    siteName: z.string(),
  }),
  twitter: z.object({
    card: z.string(),
    title: z.string(),
    description: z.string(),
    image: z.string(),
  }),
  rawUrl: z.string(),
});

const headingExtractorResponseSchema = z.object({
  headings: z.array(
    z.object({
      level: z.number(),
      text: z.string(),
    }),
  ),
  title: z.string(),
  url: z.string(),
});

/**
 * Validate API response against Zod schema.
 * Checklist 2-B: detect API response format changes early.
 */
function validateResponse<T>(
  data: unknown,
  schema: z.ZodType<T>,
  endpoint: string,
): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ApiError(
      502,
      `API response format has changed for ${endpoint}. Please update the zeronova-lab-mcp package.`,
    );
  }
  return result.data;
}

// ---- Public API functions ----

export async function checkAltAttributes(
  url: string,
): Promise<AltCheckerResponse> {
  const raw = await fetchApi<unknown>("alt-checker", { url });
  return validateResponse(raw, altCheckerResponseSchema, "alt-checker");
}

export async function checkLinks(url: string): Promise<LinkCheckerResponse> {
  const raw = await fetchApi<unknown>("link-checker", { url });
  return validateResponse(raw, linkCheckerResponseSchema, "link-checker");
}

export async function checkSpeed(
  url: string,
  strategy: "mobile" | "desktop" = "mobile",
): Promise<SpeedCheckerResponse> {
  const raw = await fetchApi<unknown>("speed-checker", { url, strategy });
  return validateResponse(raw, speedCheckerResponseSchema, "speed-checker");
}

export async function checkOgp(url: string): Promise<OgpCheckerResponse> {
  const raw = await fetchApi<unknown>("ogp-checker", { url });
  return validateResponse(raw, ogpCheckerResponseSchema, "ogp-checker");
}

export async function extractHeadings(
  url: string,
): Promise<HeadingExtractorResponse> {
  const raw = await fetchApi<unknown>("heading-extractor", { url });
  return validateResponse(
    raw,
    headingExtractorResponseSchema,
    "heading-extractor",
  );
}
