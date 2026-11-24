/** URL pubblico di un'immagine servita da `server/public`. */
export const imageUrl = (fileName) => `/static/${encodeURIComponent(fileName)}`;

/** @param {{ id: number, fileName: string, title: string, alt: string, width: number, height: number }} row */
export const toPublicImage = (row) => ({
  id: row.id,
  url: imageUrl(row.fileName),
  title: row.title,
  alt: row.alt,
  width: row.width,
  height: row.height,
});

/**
 * Accesso ai contenuti di gioco. I contenuti non cambiano a runtime, quindi immagini e
 * didascalie vengono lette una volta e tenute in memoria (sono poche decine di righe).
 * @param {import('node:sqlite').DatabaseSync} db
 */
export function createMemeRepository(db) {
  const images = db.prepare('SELECT id, fileName, title, alt, width, height FROM images ORDER BY id').all();
  const captions = db.prepare('SELECT id, text FROM captions ORDER BY id').all();
  const pairs = db.prepare('SELECT imageId, captionId FROM memes').all();

  const imageById = new Map(images.map((i) => [i.id, Object.freeze(toPublicImage(i))]));
  const captionById = new Map(captions.map((c) => [c.id, Object.freeze({ id: c.id, text: c.text })]));
  const correctByImage = new Map();
  for (const { imageId, captionId } of pairs) {
    if (!correctByImage.has(imageId)) correctByImage.set(imageId, []);
    correctByImage.get(imageId).push(captionId);
  }
  const allCaptionIds = captions.map((c) => c.id);

  return {
    imageIds: () => [...imageById.keys()],
    getImage: (id) => imageById.get(id) ?? null,
    getCaption: (id) => captionById.get(id) ?? null,
    correctCaptionIds: (imageId) => correctByImage.get(imageId) ?? [],
    /** Didascalie che NON sono corrette per l'immagine indicata. */
    wrongCaptionIds(imageId) {
      const correct = new Set(correctByImage.get(imageId) ?? []);
      return allCaptionIds.filter((id) => !correct.has(id));
    },
  };
}
