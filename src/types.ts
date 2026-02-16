// Tier 1: alt-checker response
export interface AltCheckerImage {
  src: string;
  alt: string | null;
  hasAlt: boolean;
  width: string | null;
  height: string | null;
  isDecorative: boolean;
  context: "present" | "empty" | "missing" | "decorative";
}

export interface AltCheckerResponse {
  images: AltCheckerImage[];
  title: string;
  url: string;
  summary: {
    total: number;
    withAlt: number;
    emptyAlt: number;
    missingAlt: number;
    decorative: number;
  };
}

// Tier 1: link-checker response
export interface LinkCheckerLink {
  url: string;
  text: string;
  status: number;
  statusText: string;
  isExternal: boolean;
  warning?: string;
}

export interface LinkCheckerResponse {
  links: LinkCheckerLink[];
  title: string;
  checkedUrl: string;
  totalLinks: number;
}

// Tier 1: speed-checker response
export interface SpeedMetric {
  score: number;
  value: string;
  displayValue: string;
}

export interface SpeedCheckerResponse {
  url: string;
  strategy: "mobile" | "desktop";
  performanceScore: number;
  metrics: {
    fcp: SpeedMetric;
    lcp: SpeedMetric;
    tbt: SpeedMetric;
    cls: SpeedMetric;
    si: SpeedMetric;
    tti: SpeedMetric;
  };
  opportunities: Array<{
    title: string;
    savings: string;
  }>;
  fetchedAt: string;
}

// Tier 1: ogp-checker response
export interface OgpCheckerResponse {
  ogp: {
    title: string;
    description: string;
    image: string;
    url: string;
    type: string;
    siteName: string;
  };
  twitter: {
    card: string;
    title: string;
    description: string;
    image: string;
  };
  rawUrl: string;
}

// Tier 1: heading-extractor response
export interface HeadingExtractorHeading {
  level: number;
  text: string;
}

export interface HeadingExtractorResponse {
  headings: HeadingExtractorHeading[];
  title: string;
  url: string;
}

// API error response
export interface ApiErrorResponse {
  error: string;
}
