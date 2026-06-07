import { ReviewItem } from '../../types';

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
  return !item.nextReviewAt || item.nextReviewAt.slice(0, 10) <= date;
}

export function sortWrongQuestionReviewItems(reviewItems: ReviewItem[]): ReviewItem[] {
  return reviewItems
    .filter(isWrongQuestionReviewItem)
    .sort((left, right) => (right.priorityScore ?? 0) - (left.priorityScore ?? 0));
}

export function getDueWrongQuestionReviewItems(reviewItems: ReviewItem[], now = new Date().toISOString()): ReviewItem[] {
  return sortWrongQuestionReviewItems(reviewItems).filter((item) => isReviewItemDue(item, now));
}
