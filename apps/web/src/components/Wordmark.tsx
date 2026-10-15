import { cn } from '@/lib/utils';

/**
 * Wordmark = "pavana" saja. Utilitas `font-wordmark` = Vernosa (pending, lihat
 * packages/brand/src/fonts.css) dengan fallback Comfortaa interim.
 * Tidak ada simbol/logo mark — identitas brand bertumpu pada tulisan.
 * (Ikon fungsional navigasi tetap dipakai di tempat lain sesuai kebutuhan UI.)
 */
export function Wordmark({ className, wordClassName }: { className?: string; wordClassName?: string }) {
  return (
    <span className={cn('inline-flex items-center text-ink', className)}>
      <span
        className={cn(
          'font-wordmark text-2xl font-bold leading-none tracking-[-0.05em]',
          wordClassName,
        )}
      >
        pavana
      </span>
    </span>
  );
}
