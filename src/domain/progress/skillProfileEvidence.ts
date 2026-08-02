export function isSettingsBaselineSkillProfile(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const subSkillId = (value as { subSkillId?: unknown }).subSkillId;
  return typeof subSkillId === 'string' && subSkillId.startsWith('settings-');
}
