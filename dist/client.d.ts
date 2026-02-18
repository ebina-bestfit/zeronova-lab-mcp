import type { AltCheckerResponse, LinkCheckerResponse, SpeedCheckerResponse, OgpCheckerResponse, HeadingExtractorResponse, SiteConfigCheckerResponse, SecurityHeadersCheckerResponse } from "./types.js";
export declare class ApiError extends Error {
    readonly statusCode: number;
    constructor(statusCode: number, message: string);
}
export declare function checkAltAttributes(url: string): Promise<AltCheckerResponse>;
export declare function checkLinks(url: string): Promise<LinkCheckerResponse>;
export declare function checkSpeed(url: string, strategy?: "mobile" | "desktop"): Promise<SpeedCheckerResponse>;
export declare function checkOgp(url: string): Promise<OgpCheckerResponse>;
export declare function extractHeadings(url: string): Promise<HeadingExtractorResponse>;
export declare function checkSiteConfig(url: string): Promise<SiteConfigCheckerResponse>;
export declare function checkSecurityHeaders(url: string): Promise<SecurityHeadersCheckerResponse>;
//# sourceMappingURL=client.d.ts.map