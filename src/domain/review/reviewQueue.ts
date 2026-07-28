import { ReviewItem } from '../../types';

export function toLocalDateKey(value: Date | string = new Date()): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10);
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeAnswer(value: unknown): string {
  return String(value ?? '').trim().toUpperCase();
}

export function isWrongQuestionReviewItem(item: ReviewItem): boolean {
  const redoQuestion = item.redoQuestion;
  const correctAnswer = normalizeAnswer(redoQuestion?.correctAnswer);

  if (!correctAnswer) return false;

  return normalizeAnswer(redoQuestion?.userAnswer) !== correctAnswer;
}

export function isActionableReviewItem(item: ReviewItem): boolean {
  return Boolean(
    item.redoQuestion
    || item.memoryTask
    || item.detail.trim()
    || item.title.trim(),
  );
}

export function isReviewItemDue(item: ReviewItem, now = new Date().toISOString()): boolean {
  return !item.nextReviewAt || item.nextReviewAt <= now;
}

export function isReviewItemDueOn(item: ReviewItem, date: string): boolean {
  return !item.nextReviewAt || toLocalDateKey(item.nextReviewAt) <= date;
}

function reviewTime(value?: string): number {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function reviewIdentity(item: ReviewItem): string {
  if (!item.targetId) return `id:${item.id}`;
  return [item.examId ?? '', item.moduleId ?? '', item.targetType ?? '', item.targetId].join(':');
}

function reviewEvidenceTime(item: ReviewItem): number {
  return Math.max(reviewTime(item.lastReviewedAt), reviewTime(item.createdAt));
}

export function coalesceReviewItems(reviewItems: ReviewItem[]): ReviewItem[] {
  const latestByTarget = new Map<string, ReviewItem>();
  reviewItems.filter(isActionableReviewItem).forEach((item) => {
    const key = reviewIdentity(item);
    const current = latestByTarget.get(key);
    if (!current
      || reviewEvidenceTime(item) > reviewEvidenceTime(current)
      || (reviewEvidenceTime(item) === reviewEvidenceTime(current)
        && (item.priorityScore ?? 0) > (current.priorityScore ?? 0))) {
      latestByTarget.set(key, item);
    }
  });
  return [...latestByTarget.values()];
}

export function sortReviewItems(reviewItems: ReviewItem[]): ReviewItem[] {
  return coalesceReviewItems(reviewItems)
    .sort((left, right) => {
      const dueDiff = reviewTime(left.nextReviewAt) - reviewTime(right.nextReviewAt);
      if (dueDiff !== 0) return dueDiff;
      return (right.priorityScore ?? 0) - (left.priorityScore ?? 0);
    });
}

export function sortWrongQuestionReviewItems(reviewItems: ReviewItem[]): ReviewItem[] {
  return sortReviewItems(reviewItems);
}

export function getDueWrongQuestionReviewItems(reviewItems: ReviewItem[], now = new Date().toISOString()): ReviewItem[] {
  return sortReviewItems(reviewItems).filter((item) => isReviewItemDue(item, now));
}

export function getDueWrongQuestionReviewItemsOn(reviewItems: ReviewItem[], date = toLocalDateKey()): ReviewItem[] {
  return sortReviewItems(reviewItems).filter((item) => isReviewItemDueOn(item, date));
}
