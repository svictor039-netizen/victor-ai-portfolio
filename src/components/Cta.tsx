import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react';
import '../styles/cta.css';

type Props = { label: string } & (
  | ({ href: string } & AnchorHTMLAttributes<HTMLAnchorElement>)
  | ({ href?: never } & ButtonHTMLAttributes<HTMLButtonElement>)
);

/** One full-surface state transition for links and native form buttons. */
export default function Cta({ label, className, ...props }: Props) {
  const content = <span data-cta-label>{label}</span>;
  const classes = ['cta', className].filter(Boolean).join(' ');
  if (props.href !== undefined) {
    return <a {...props as AnchorHTMLAttributes<HTMLAnchorElement>} className={classes}>{content}</a>;
  }
  return <button type="button" {...props as ButtonHTMLAttributes<HTMLButtonElement>} className={classes}>{content}</button>;
}
