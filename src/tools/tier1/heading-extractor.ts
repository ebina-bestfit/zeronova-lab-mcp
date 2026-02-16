import { extractHeadings } from "../../client.js";
import type { HeadingExtractorResponse } from "../../types.js";

export async function handleHeadingExtractor(
  url: string,
): Promise<HeadingExtractorResponse> {
  return extractHeadings(url);
}
