import React, { useEffect, useRef, useState } from 'react';
import { getSupabaseClient } from '../lib/supabase';

const SIGNED_URL_TTL_SECONDS = 45 * 60;
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

function isRemoteUrl(value: string): boolean {
  return value.startsWith('https://') || value.startsWith('http://') || value.startsWith('data:image/');
}

export async function resolveAttendancePhotoUrl(source: string): Promise<string | null> {
  if (!source) return null;
  if (isRemoteUrl(source)) return source;
  const cached = signedUrlCache.get(source);
  if (cached && cached.expiresAt > Date.now()) return cached.url;
  const client = getSupabaseClient();
  if (!client) return null;
  const { data, error } = await client.storage.from('attendance-selfies')
    .createSignedUrl(source, SIGNED_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) return null;
  signedUrlCache.set(source, { url: data.signedUrl, expiresAt: Date.now() + SIGNED_URL_TTL_SECONDS * 1000 });
  return data.signedUrl;
}

interface AttendancePhotoProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
}

/** Loads private attendance photos only when the image is near the viewport. */
export default function AttendancePhoto({ src, fallbackSrc, onError, ...props }: AttendancePhotoProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const directRemote = typeof src === 'string' && src.length > 0 && isRemoteUrl(src);
  const [shouldLoad, setShouldLoad] = useState(directRemote);
  const [resolvedSrc, setResolvedSrc] = useState<string | undefined>(directRemote ? src : undefined);

  useEffect(() => {
    if (directRemote) {
      setShouldLoad(true);
      setResolvedSrc(src);
      return;
    }
    const image = imageRef.current;
    if (!image || shouldLoad) return;
    if (typeof IntersectionObserver === 'undefined') {
      setShouldLoad(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setShouldLoad(true);
        observer.disconnect();
      }
    }, { rootMargin: '160px' });
    observer.observe(image);
    return () => observer.disconnect();
  }, [directRemote, shouldLoad, src]);

  useEffect(() => {
    if (!shouldLoad || typeof src !== 'string' || !src) return;
    let cancelled = false;
    if (isRemoteUrl(src)) {
      setResolvedSrc(src);
      return () => { cancelled = true; };
    }

    void resolveAttendancePhotoUrl(src)
      .then((signedUrl) => {
        if (cancelled) return;
        if (!signedUrl) {
          setResolvedSrc(fallbackSrc);
          return;
        }
        setResolvedSrc(signedUrl);
      })
      .catch(() => { if (!cancelled) setResolvedSrc(fallbackSrc); });
    return () => { cancelled = true; };
  }, [fallbackSrc, shouldLoad, src]);

  const effectiveSrc = directRemote ? src : shouldLoad ? (resolvedSrc || fallbackSrc) : fallbackSrc;

  return <img {...props} ref={imageRef} src={effectiveSrc} loading={directRemote ? 'eager' : 'lazy'} onError={(event) => {
    if (fallbackSrc && event.currentTarget.src !== fallbackSrc) event.currentTarget.src = fallbackSrc;
    onError?.(event);
  }} />;
}
