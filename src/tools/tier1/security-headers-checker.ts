import { checkSecurityHeaders } from "../../client.js";
import type { SecurityHeadersCheckerResponse } from "../../types.js";

export async function handleSecurityHeadersChecker(
  url: string,
): Promise<SecurityHeadersCheckerResponse> {
  return checkSecurityHeaders(url);
}
