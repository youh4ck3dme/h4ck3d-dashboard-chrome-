const formats = {
  short: new Intl.DateTimeFormat('sk-SK', { month: 'short', year: 'numeric' }),
  long: new Intl.DateTimeFormat('sk-SK', { month: 'long', year: 'numeric' }),
};

export function formatDate(iso: string, style: keyof typeof formats): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : formats[style].format(d);
}
