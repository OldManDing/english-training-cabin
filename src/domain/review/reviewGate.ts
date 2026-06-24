import { ReviewItem } from '../../types';
import { isReviewItemDueOn, sortWrongQuestionReviewItems, toLocalDateKey } from './reviewQueue';

export const DAILY_REQUIRED_REVIEW_LIMIT = 3;

export interface ReviewGateStatus {
  date: string;
  dueCount: number;
  completedToday: number;
  requiredToday: number;
  remainingRequired: number;
  locked: boolean;
  dueItems: ReviewItem[];
}

function todayIsoDate(): string {
  return toLocalDateKey();
}

function wasReviewedOn(item: ReviewItem, date: string): boolean {
  return item.lastReviewedAt ? toLocalDateKey(item.lastReviewedAt) === date : false;
}

export function buildReviewGateStatus(reviewItems: ReviewItem[], date = todayIsoDate()): ReviewGateStatus {
  const wrongQuestionItems = sortWrongQuestionReviewItems(reviewItems);
  const dueItems = wrongQuestionItems.filter((item) => isReviewItemDueOn(item, date));
  const completedToday = wrongQuestionItems.filter((item) => wasReviewedOn(item, date)).length;
  const requiredToday = Math.min(DAILY_REQUIRED_REVIEW_LIMIT, dueItems.length + completedToday);
  const remainingRequired = Math.max(0, requiredToday - completedToday);

  return {
    date,
    dueCount: dueItems.length,
    completedToday,
    requiredToday,
    remainingRequired,
    locked: dueItems.length > 0 && remainingRequired > 0,
    dueItems,
  };
}
