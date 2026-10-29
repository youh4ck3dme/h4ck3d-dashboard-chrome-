import { describe, expect, it } from 'vitest';
import { CATEGORIES, STATUSES, VISIBILITIES } from './filter';
import { categoryLabel, projectCount, riskLabel, statusLabel, t, visibilityLabel } from './i18n';

describe('i18n', () => {
  it('covers every dashboard label named in the brief', () => {
    const labels = [
      t.filters.title,
      t.nav.timeline,
      t.card.open,
      t.filters.all,
      t.filters.clear,
      t.detail.business,
      t.detail.technical,
      t.detail.category,
      t.detail.status,
      t.detail.visibility,
      t.detail.date,
      t.detail.stack,
      t.detail.risk,
      t.detail.nextStep,
      t.timeline.featured,
    ];
    for (const label of labels) expect(label.trim()).not.toBe('');
  });

  it('leaves no English dashboard labels behind (F1)', () => {
    const copy = [
      t.filters.title,
      t.filters.clear,
      t.filters.all,
      t.filters.featuredOnly,
      t.nav.timeline,
      t.nav.sources,
      t.card.open,
      t.detail.business,
      t.detail.technical,
      t.detail.risk,
      t.detail.nextStep,
      t.empty.title,
      t.empty.action,
      t.stats.total,
      t.stats.production,
    ];
    const english =
      /^(Featured|Timeline|Open|Clear all filters|All Filters|Business purpose|Technical purpose|Category|Status|Visibility|Date|Stack|Risk level|Next step)$/;
    for (const label of copy) expect(english.test(label)).toBe(false);
  });

  it('translates every data status, visibility, category and risk level', () => {
    for (const status of STATUSES) expect(statusLabel[status].trim()).not.toBe('');
    for (const visibility of VISIBILITIES) expect(visibilityLabel[visibility].trim()).not.toBe('');
    for (const category of CATEGORIES) expect(categoryLabel[category].trim()).not.toBe('');
    for (const risk of ['Low', 'Medium', 'High'] as const) expect(riskLabel[risk].trim()).not.toBe('');
    expect(statusLabel.Production).toBe('Produkcia');
    expect(visibilityLabel.Private).toBe('Súkromné');
  });

  it('uses Slovak plural forms for project counts', () => {
    expect(projectCount(1)).toBe('1 projekt');
    expect(projectCount(3)).toBe('3 projekty');
    expect(projectCount(0)).toBe('0 projektov');
    expect(projectCount(18)).toBe('18 projektov');
  });
});
