/**
 * Adapted from @kokonutui/gradient-button, retrieved through shadcn MCP.
 * @author @dorianbaffier · @version 1.0.0 · @date 2025-06-26 · @license MIT
 * https://github.com/kokonut-labs/kokonutui
 * Adaptation: native anchor, CSS-variable palette, opaque text,
 * reduced motion, no dynamic Tailwind classes or hydration.
 */
import type { AnchorHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface GradientButtonProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  label: string;
  href: string;
  splitAfter?: number;
}

export default function GradientButton({ label, splitAfter, className, ...props }: GradientButtonProps) {
  const words = label.split(' ');
  const hasSplitLabel = splitAfter !== undefined && splitAfter > 0 && splitAfter < words.length;

  return (
    <a {...props} className={cn('gradient-button group relative inline-flex min-h-12 items-center justify-center overflow-hidden rounded-xl px-6 py-3 font-semibold', className)}>
      <span aria-hidden="true" className="gradient-button-ring pointer-events-none absolute inset-0 rounded-xl" />
      <span aria-hidden="true" className="gradient-base pointer-events-none absolute inset-[1px] rounded-[11px]" />
      <span aria-hidden="true" className="gradient-button-sheen pointer-events-none absolute inset-[1px] rounded-[11px]" />
      <span aria-hidden="true" className="gradient-button-sheen-hover pointer-events-none absolute inset-[1px] rounded-[11px] opacity-0 transition-opacity duration-150 group-hover:opacity-100 motion-reduce:transition-none" />
      <span className="gradient-label relative flex items-center justify-center gap-3">
        {hasSplitLabel ? (
          <>
            <span className="gradient-label--light">{words.slice(0, splitAfter).join(' ')}</span>
            <span className="gradient-label--dark flex items-center justify-center gap-3">{words.slice(splitAfter).join(' ')}<span aria-hidden="true">↗</span></span>
          </>
        ) : (
          <>{label}<span aria-hidden="true">↗</span></>
        )}
      </span>
    </a>
  );
}
