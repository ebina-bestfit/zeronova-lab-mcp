import { checkLinks } from "../../client.js";
import type { LinkCheckerResponse } from "../../types.js";

export async function handleLinkChecker(
  url: string,
): Promise<LinkCheckerResponse> {
  return checkLinks(url);
}
