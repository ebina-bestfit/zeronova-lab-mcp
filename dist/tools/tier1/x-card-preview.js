import { checkOgp } from "../../client.js";
export async function handleXCardPreview(url) {
    const data = await checkOgp(url);
    const issues = [];
    if (!data.twitter.card) {
        issues.push("twitter:card meta tag is missing");
    }
    if (!data.twitter.title && !data.ogp.title) {
        issues.push("Neither twitter:title nor og:title is set");
    }
    if (!data.twitter.description && !data.ogp.description) {
        issues.push("Neither twitter:description nor og:description is set");
    }
    if (!data.twitter.image && !data.ogp.image) {
        issues.push("Neither twitter:image nor og:image is set");
    }
    const hasCard = !!data.twitter.card;
    const hasTitle = !!(data.twitter.title || data.ogp.title);
    const hasDescription = !!(data.twitter.description || data.ogp.description);
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
//# sourceMappingURL=x-card-preview.js.map