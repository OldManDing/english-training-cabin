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

export function isReviewItemDue(item: ReviewItem, now = new Date().toISOString()): boolean {
  return !item.nextReviewAt || item.nextReviewAt <= now;
}

export function isReviewItemDueOn(item: ReviewItem, date: string): boolean {
  return !item.nextReviewAt || toLocalDateKey(item.nextReviewAt) <= date;
}

export function sortWrongQuestionReviewItems(reviewItems: ReviewItem[]): ReviewItem[] {
  return reviewItems
    .filter(isWrongQuestionReviewItem)
    .sort((left, right) => (right.priorityScore ?? 0) - (left.priorityScore ?? 0));
}

export function getDueWrongQuestionReviewItems(reviewItems: ReviewItem[], now = new Date().toISOString()): ReviewItem[] {
  return sortWrongQuestionReviewItems(reviewItems).filter((item) => isReviewItemDue(item, now));
}

export function getDueWrongQuestionReviewItemsOn(reviewItems: ReviewItem[], date = toLocalDateKey()): ReviewItem[] {
  return sortWrongQuestionReviewItems(reviewItems).filter((item) => isReviewItemDueOn(item, date));
}
