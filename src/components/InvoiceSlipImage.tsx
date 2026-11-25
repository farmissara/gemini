import React, { useEffect, useState } from 'react';
import { fetchInvoiceSlipImageFromSupabase } from '../lib/supabase';

const slipImageCache = new Map<string, string | null>();

interface InvoiceSlipImageProps {
  schoolId: string;
  invoiceId: string;
  initialSrc?: string;
  slipStatus?: string;
  alt: string;
  className?: string;
}

export const InvoiceSlipImage: React.FC<InvoiceSlipImageProps> = ({
  schoolId,
  invoiceId,
  initialSrc,
  slipStatus,
  alt,
  className = 'w-full max-h-48 object-contain rounded-lg border border-[var(--color-border)] bg-white',
}) => {
  const cacheKey = `${schoolId}::${invoiceId}`;
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(() => {
    if (initialSrc) return initialSrc;
    return slipImageCache.get(cacheKey) ?? null;
  });
  const [loading, setLoading] = useState<boolean>(() => {
    if (initialSrc) return false;
    if (slipImageCache.has(cacheKey)) return false;
    return Boolean(schoolId && invoiceId && slipStatus && slipStatus !== 'none');
  });

  useEffect(() => {
    if (initialSrc) {
      slipImageCache.set(cacheKey, initialSrc);
      setResolvedSrc(initialSrc);
      setLoading(false);
      return;
    }

    if (slipImageCache.has(cacheKey)) {
      setResolvedSrc(slipImageCache.get(cacheKey) ?? null);
      setLoading(false);
      return;
    }

    if (!schoolId || !invoiceId || !slipStatus || slipStatus === 'none') {
      setResolvedSrc(null);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    void fetchInvoiceSlipImageFromSupabase(schoolId, invoiceId)
      .then((url) => {
        slipImageCache.set(cacheKey, url);
        if (!active) return;
        setResolvedSrc(url);
      })
      .catch(() => {
        if (!active) return;
        setResolvedSrc(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [cacheKey, initialSrc, invoiceId, schoolId, slipStatus]);

  if (loading) {
    return (
      <div className="w-full py-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-center text-xs text-[var(--color-text-muted)]">
        กำลังโหลดภาพสลิป...
      </div>
    );
  }

  if (!resolvedSrc) {
    return (
      <div className="w-full py-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-center text-xs text-[var(--color-text-muted)]">
        ไม่พบไฟล์ภาพสลิปสำหรับรายการนี้
      </div>
    );
  }

  return <img src={resolvedSrc} alt={alt} referrerPolicy="no-referrer" className={className} />;
};
