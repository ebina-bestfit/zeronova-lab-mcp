import { checkSchemaCompleteness } from "../../client.js";
import type { SchemaCheckerResponse } from "../../types.js";

export async function handleSchemaChecker(
  url: string,
): Promise<SchemaCheckerResponse> {
  return checkSchemaCompleteness(url);
}
