import { checkImageOptimization } from "../../client.js";
import type { ImageCheckerResponse } from "../../types.js";

export async function handleImageChecker(
  url: string,
): Promise<ImageCheckerResponse> {
  return checkImageOptimization(url);
}
