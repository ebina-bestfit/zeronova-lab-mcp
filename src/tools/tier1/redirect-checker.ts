import { checkRedirectChain } from "../../client.js";
import type { RedirectCheckerResponse } from "../../types.js";

export async function handleRedirectChecker(
  url: string,
): Promise<RedirectCheckerResponse> {
  return checkRedirectChain(url);
}
