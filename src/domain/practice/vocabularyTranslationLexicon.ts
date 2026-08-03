type VocabularyLexiconItem = {
  word: string;
  meaning: string;
};

const vocabularyGlosses = new Map<string, string[]>();

export function registerVocabularyTranslationLexicon(items: readonly VocabularyLexiconItem[]) {
  vocabularyGlosses.clear();
  for (const item of items) {
    const glosses = item.meaning
      .replace(/[（）()]/gu, '；')
      .split(/[；;,，/]/gu)
      .map((gloss) => gloss.trim())
      .filter(Boolean);
    if (glosses.length) vocabularyGlosses.set(item.word.trim().toLowerCase(), glosses);
  }
}

export function getVocabularyTranslationGloss(word: string) {
  return vocabularyGlosses.get(word.trim().toLowerCase())?.[0] ?? null;
}
