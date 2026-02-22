import { checkCacheHeaders } from "../../client.js";
import type { CacheCheckerResponse } from "../../types.js";

export async function handleCacheChecker(
  url: string,
): Promise<CacheCheckerResponse> {
  return checkCacheHeaders(url);
}
