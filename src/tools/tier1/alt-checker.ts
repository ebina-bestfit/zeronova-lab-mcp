import { checkAltAttributes } from "../../client.js";
import type { AltCheckerResponse } from "../../types.js";

export async function handleAltChecker(
  url: string,
): Promise<AltCheckerResponse> {
  return checkAltAttributes(url);
}
