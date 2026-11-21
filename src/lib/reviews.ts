// Real client reviews only: sent by Anthony, used with the client's
// permission, word for word. Never write, paraphrase, combine or polish one.
// The homepage strip renders nothing while this list is empty.
//
// Each entry: the quote exactly as the client wrote it, the client's first
// name and last initial, and a detail such as "Sold in Cedarburg".
//
// No aggregateRating or Review schema for these: Google ignores self serving
// review markup and can flag it.
export type Review = { quote: string; name: string; detail: string };

export const REVIEWS: Review[] = [];

// The Google review page, once Anthony's Business Profile is live.
export const GOOGLE_REVIEWS_URL = "";
