function toLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getSuggestedExamDate(now = new Date(), daysAhead = 120): string {
  const suggested = new Date(now);
  suggested.setHours(12, 0, 0, 0);
  suggested.setDate(suggested.getDate() + Math.max(30, Math.floor(daysAhead)));
  return toLocalIsoDate(suggested);
}
