import { checkSpeed } from "../../client.js";
export async function handleSpeedChecker(url, strategy) {
    const validStrategy = strategy === "desktop" ? "desktop" : "mobile";
    return checkSpeed(url, validStrategy);
}
//# sourceMappingURL=speed-checker.js.map