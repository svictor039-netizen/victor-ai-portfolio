import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { ServiceOffer } from '@/data/home';
import { cn } from '@/lib/utils';

const iconPaths: Record<ServiceOffer['icon'], string> = {
  spark: 'm12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4Z',
  chat: 'M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6 3V6a2 2 0 0 1 2-2Z M7 9h10 M7 13h6',
  web: 'M3 5h18v14H3Z M3 9h18 M7 7h.01 M10 7h.01 M8 13l-2 2 2 2 M16 13l2 2-2 2',
  flow: 'M3 3h6v6H3Z M15 15h6v6h-6Z M6 9v9h9 M15 3h6v6h-6Z M9 6h6',
};

function canHover() {
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function ServiceFlipCard({ service }: { service: ServiceOffer }) {
  const labelId = useId();
  const ignoreHover = useRef(false);
  const source = useRef<'none' | 'hover' | 'toggle'>('none');
  const [flipped, setFlipped] = useState(false);

  const showFront = useCallback(() => {
    source.current = 'none';
    setFlipped(false);
  }, []);

  const showBack = useCallback((next: 'hover' | 'toggle') => {
    source.current = next;
    setFlipped(true);
  }, []);

  const toggle = useCallback(() => {
    if (source.current === 'hover') {
      source.current = 'toggle';
      setFlipped(true);
      return;
    }
    if (flipped) {
      ignoreHover.current = true;
      showFront();
      return;
    }
    showBack('toggle');
  }, [flipped, showBack, showFront]);

  const onMouseEnter = useCallback(() => {
    if (ignoreHover.current || prefersReducedMotion() || !canHover()) return;
    if (source.current === 'toggle') return;
    showBack('hover');
  }, [showBack]);

  const onMouseLeave = useCallback(() => {
    ignoreHover.current = false;
    if (source.current === 'hover') showFront();
  }, [showFront]);

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMotion = () => {
      if (motion.matches && source.current === 'hover') showFront();
    };
    motion.addEventListener('change', onMotion);
    return () => motion.removeEventListener('change', onMotion);
  }, [showFront]);

  return (
    <article
      className={cn('service-flip icon-host', flipped && 'is-flipped')}
      data-accent={service.accent}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="service-flip-inner">
        <div className="service-face service-face-front">
          <button
            type="button"
            className="service-flip-toggle"
            aria-pressed={flipped}
            aria-labelledby={labelId}
            tabIndex={flipped ? -1 : 0}
            onClick={toggle}
          >
            <span className="service-top">
              <span className={cn('type-icon', 'icon-outline', service.spark && 'icon-spark')}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={iconPaths[service.icon]} />
                </svg>
              </span>
              <span className="service-number">{service.number}</span>
            </span>
            <h3 id={labelId}>{service.name}</h3>
            <p>{service.description}</p>
            <ul className="service-points">
              {service.front.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <span className="text-link service-more">
              Подробнее <span aria-hidden="true">→</span>
            </span>
          </button>
        </div>

        <div
          className="service-face service-face-back"
          aria-hidden={!flipped}
          onClick={(event) => {
            if ((event.target as HTMLElement).closest('a, button')) return;
            toggle();
          }}
        >
          <div className="service-back-copy">
            <p className="service-back-kicker">Что вы получаете</p>
            <h3>{service.name}</h3>
            <ul className="service-points">
              {service.back.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="service-result">{service.result}</p>
          </div>
          <div className="service-back-actions">
            <a className="button button-dark service-discuss" href="#contact" tabIndex={flipped ? 0 : -1} onClick={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
              Обсудить задачу <span aria-hidden="true">↗</span>
            </a>
            <button type="button" className="service-flip-back" tabIndex={flipped ? 0 : -1} onClick={toggle}>
              Назад
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
