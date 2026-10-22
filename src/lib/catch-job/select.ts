/**
 * Правило отбора Catch_Job_4Me (неизменно):
 * 1 самый свежий заказ × 1 тематика × 1 канал × 1 ручная рассылка.
 * Других рейтингов, лимитов и бизнес-фильтров нет. Окно свежести — 72 ч
 * (решение владельца 22.10.2026, PLAN_bot.md, решение 6).
 */
import type { ItemTopic, TopicCode } from './topics';

export const FRESH_WINDOW_MS = 72 * 3600 * 1000;

export interface SelectableItem {
  id: number;
  itemKey: string;
  sourceHandle: string;
  topic: ItemTopic;
  postedAt: number;
}

export interface Pick<T extends SelectableItem = SelectableItem> {
  sourceHandle: string;
  topic: TopicCode;
  item: T | null;
}

export function selectPicks<T extends SelectableItem>(
  items: T[],
  sources: string[],
  topics: TopicCode[],
  now: number
): Pick<T>[] {
  const from = now - FRESH_WINDOW_MS;
  // Дубликаты исходного заказа (одинаковый item_key) учитываются один раз
  const unique = new Map<string, T>();
  for (const it of items) if (!unique.has(it.itemKey)) unique.set(it.itemKey, it);

  const picks: Pick<T>[] = [];
  for (const sourceHandle of sources) {
    for (const topic of topics) {
      let best: T | null = null;
      for (const it of unique.values()) {
        if (it.sourceHandle !== sourceHandle || it.topic !== topic) continue;
        if (it.postedAt < from || it.postedAt > now) continue;
        // Самый свежий; при равном времени — больший id (детерминированно)
        if (!best || it.postedAt > best.postedAt || (it.postedAt === best.postedAt && it.id > best.id)) best = it;
      }
      picks.push({ sourceHandle, topic, item: best });
    }
  }
  return picks;
}
