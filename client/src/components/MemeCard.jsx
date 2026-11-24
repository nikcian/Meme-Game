import { useState } from 'react';

/**
 * Immagine di un meme con didascalia sovrapposta nel classico stile (maiuscolo bianco
 * con contorno nero). Le dimensioni intrinseche evitano spostamenti del layout durante il caricamento.
 *
 * @param {{
 *   image: { url: string, alt: string, width: number, height: number },
 *   caption?: string | null,
 *   topCaption?: string | null,
 *   priority?: boolean,
 *   className?: string,
 *   children?: import('react').ReactNode,
 * }} props
 */
export function MemeCard({ image, caption, topCaption, priority = false, className = '', children }) {
  const [loadedUrl, setLoadedUrl] = useState(null);
  const loaded = loadedUrl === image.url;

  return (
    <figure className={`meme ${loaded ? 'is-loaded' : ''} ${className}`} style={{ '--ratio': `${image.width} / ${image.height}` }}>
      <img
        className="meme__img"
        src={image.url}
        alt={image.alt}
        width={image.width}
        height={image.height}
        decoding="async"
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        onLoad={() => setLoadedUrl(image.url)}
        draggable="false"
      />
      {topCaption && (
        <figcaption className="meme__text meme__text--top" style={{ '--len': topCaption.length }}>
          {topCaption}
        </figcaption>
      )}
      {caption && (
        <figcaption key={caption} className="meme__text meme__text--bottom" style={{ '--len': caption.length }}>
          {caption}
        </figcaption>
      )}
      {children}
    </figure>
  );
}
