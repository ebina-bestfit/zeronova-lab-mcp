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
export declare function handleXCardPreview(url: string): Promise<XCardPreviewResponse>;
//# sourceMappingURL=x-card-preview.d.ts.map