import { checkSiteConfig } from "../../client.js";
import type { SiteConfigCheckerResponse } from "../../types.js";

export async function handleSiteConfigChecker(
  url: string,
): Promise<SiteConfigCheckerResponse> {
  return checkSiteConfig(url);
}
