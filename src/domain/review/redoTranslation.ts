import { ChoiceOption, ReviewItem } from '../../types';
import { buildAnsweredQuestionSnapshotIndex } from '../practice/answerHistory';

export interface RedoQuestionTranslation {
  prompt?: string;
  context?: string;
  options?: Partial<Record<ChoiceOption, string>>;
}

function hasTranslation(translation: RedoQuestionTranslation): boolean {
  return Boolean(
    translation.prompt
    || translation.context
    || Object.values(translation.options ?? {}).some(Boolean),
  );
}

export function resolveRedoQuestionTranslation(item: ReviewItem): RedoQuestionTranslation | null {
  const inlineTranslation = item.redoQuestion?.translation;
  if (inlineTranslation && hasTranslation(inlineTranslation)) return inlineTranslation;

  const targetId = item.targetId;
  if (!targetId) return null;

  const index = buildAnsweredQuestionSnapshotIndex();
  const snapshot = index.get(`${item.moduleId ?? '*'}:${targetId}`) ?? index.get(`*:${targetId}`);
  if (!snapshot) return null;

  const translation = {
    prompt: snapshot.promptTranslation,
    context: snapshot.contextTranslation,
    options: snapshot.optionTranslations,
  };

  return hasTranslation(translation) ? translation : null;
}
