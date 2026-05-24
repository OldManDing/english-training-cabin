import { ExamProfile } from '../types';
import { CET4_EXAM_PROFILE } from './cet4';

export const EXAM_REGISTRY: Record<string, ExamProfile> = {
  [CET4_EXAM_PROFILE.id]: CET4_EXAM_PROFILE,
};

export function getExamProfile(examId: string): ExamProfile {
  return EXAM_REGISTRY[examId] ?? CET4_EXAM_PROFILE;
}
