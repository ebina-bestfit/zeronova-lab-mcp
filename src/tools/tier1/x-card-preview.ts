import { checkOgp } from "../../client.js";
import type { OgpCheckerResponse } from "../../types.js";

export interface XCardPreviewResponse {
  url: string;
  card: {
    type: string;
    title: string;
    description: string;
    image: string;
  };
  validation: {
    hasCard: boolean;
    hasTitle: boolean;
    hasDescription: boolean;
    hasImage: boolean;
    isValid: boolean;
    issues: string[];
  };
  ogpFallback: {
    title: string;
    description: string;
    image: string;
  };
}

export async function handleXCardPreview(
  url: string,
): Promise<XCardPreviewResponse> {
  const data: OgpCheckerResponse = await checkOgp(url);

  const issues: string[] = [];

  if (!data.twitter.card) {
    issues.push("twitter:card meta tag is missing");
  }
  if (!data.twitter.title && !data.ogp.title) {
    issues.push(
      "Neither twitter:title nor og:title is set",
    );
  }
  if (!data.twitter.description && !data.ogp.description) {
    issues.push(
      "Neither twitter:description nor og:description is set",
    );
  }
  if (!data.twitter.image && !data.ogp.image) {
    issues.push(
      "Neither twitter:image nor og:image is set",
    );
  }

  const hasCard = !!data.twitter.card;
  const hasTitle = !!(data.twitter.title || data.ogp.title);
  const hasDescription = !!(
    data.twitter.description || data.ogp.description
  );
  const hasImage = !!(data.twitter.image || data.ogp.image);

  return {
    url: data.rawUrl,
    card: {
      type: data.twitter.card || "summary",
      title: data.twitter.title || data.ogp.title,
      description: data.twitter.description || data.ogp.description,
      image: data.twitter.image || data.ogp.image,
    },
    validation: {
      hasCard,
      hasTitle,
      hasDescription,
      hasImage,
      isValid: hasCard && hasTitle && hasDescription && hasImage,
      issues,
    },
    ogpFallback: {
      title: data.ogp.title,
      description: data.ogp.description,
      image: data.ogp.image,
    },
  };
}
