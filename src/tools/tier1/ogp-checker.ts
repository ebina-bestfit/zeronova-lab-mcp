import { checkOgp } from "../../client.js";
import type { OgpCheckerResponse } from "../../types.js";

export async function handleOgpChecker(
  url: string,
): Promise<OgpCheckerResponse> {
  return checkOgp(url);
}
