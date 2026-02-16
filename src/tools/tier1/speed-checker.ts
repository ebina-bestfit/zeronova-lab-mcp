import { checkSpeed } from "../../client.js";
import type { SpeedCheckerResponse } from "../../types.js";

export async function handleSpeedChecker(
  url: string,
  strategy?: string,
): Promise<SpeedCheckerResponse> {
  const validStrategy =
    strategy === "desktop" ? "desktop" : "mobile";
  return checkSpeed(url, validStrategy);
}
