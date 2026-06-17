// Default Open Graph / social-share image — the generated app/opengraph-image.tsx.
// Next replaces the whole `openGraph` object per segment (metadata is shallow-
// merged; nested objects are overwritten, not deep-merged), so any page that
// defines its own openGraph drops the root file-convention image. Spread
// OG_IMAGES into each page's openGraph to restore it. The relative URL resolves
// against metadataBase, which is set in the root layout and inherited.
export const OG_IMAGES = ["/opengraph-image"];
