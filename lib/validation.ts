export function cleanText(value: unknown, max = 500): string {
  return (
    typeof value === 'string' || typeof value === 'number' ? String(value) : ''
  )
    .trim()
    .slice(0, max);
}

export function validEmail(value: string): boolean {
  return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function validIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}
