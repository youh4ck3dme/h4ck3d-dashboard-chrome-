import { describe, expect, it } from 'vitest';
import type { Project } from '../data/projects';
import {
  activeFilterCount,
  filterProjects,
  groupProjectsByYearMonth,
  hasActiveFilters,
  initialFilterState,
  toggleItem,
} from './filter';

const base: Project = {
  id: 'x',
  name: 'X',
  story: '',
  category: 'Web',
  status: 'Production',
  visibility: 'Public',
  tech: [],
  date: '2024-01-15T00:00:00.000Z',
  maturity: 3,
  featured: false,
  businessPurpose: '',
  technicalPurpose: '',
  risk: 'Low',
  nextStep: '',
};
const make = (o: Partial<Project>): Project => ({ ...base, ...o });

const list = [
  make({
    id: 'a',
    name: 'Booking Pro',
    story: 'Salón rezervácie',
    tech: ['React'],
    date: '2024-03-01T00:00:00Z',
  }),
  make({ id: 'b', name: 'IČO Atlas', category: 'SaaS', featured: true, date: '2025-06-10T00:00:00Z' }),
  make({
    id: 'c',
    name: 'Old site',
    status: 'Archived',
    visibility: 'Private',
    date: '2022-02-02T00:00:00Z',
  }),
];

describe('filterProjects', () => {
  it('sorts newest first by default', () => {
    expect(filterProjects(list, initialFilterState).map((p) => p.id)).toEqual(['b', 'a', 'c']);
  });

  it('sorts oldest first', () => {
    expect(filterProjects(list, { ...initialFilterState, sort: 'oldest' }).map((p) => p.id)).toEqual([
      'c',
      'a',
      'b',
    ]);
  });

  it('searches name, story and tech, ignoring diacritics and case', () => {
    const q = (search: string) => filterProjects(list, { ...initialFilterState, search }).map((p) => p.id);
    expect(q('ico')).toEqual(['b']);
    expect(q('salon')).toEqual(['a']);
    expect(q('react')).toEqual(['a']);
    expect(q('booking react')).toEqual(['a']);
    expect(q('booking vue')).toEqual([]);
  });

  it('applies facet filters', () => {
    expect(filterProjects(list, { ...initialFilterState, categories: ['SaaS'] }).map((p) => p.id)).toEqual([
      'b',
    ]);
    expect(filterProjects(list, { ...initialFilterState, statuses: ['Archived'] }).map((p) => p.id)).toEqual([
      'c',
    ]);
    expect(
      filterProjects(list, { ...initialFilterState, visibilities: ['Private'] }).map((p) => p.id),
    ).toEqual(['c']);
    expect(filterProjects(list, { ...initialFilterState, featuredOnly: true }).map((p) => p.id)).toEqual([
      'b',
    ]);
  });

  it('does not mutate the input array', () => {
    const copy = [...list];
    filterProjects(list, initialFilterState);
    expect(list).toEqual(copy);
  });
});

describe('helpers', () => {
  it('toggleItem adds and removes', () => {
    expect(toggleItem(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggleItem(['a', 'b'], 'a')).toEqual(['b']);
  });

  it('counts active filters', () => {
    expect(activeFilterCount(initialFilterState)).toBe(0);
    expect(hasActiveFilters(initialFilterState)).toBe(false);
    expect(hasActiveFilters({ ...initialFilterState, search: '  ' })).toBe(false);
    expect(activeFilterCount({ ...initialFilterState, categories: ['AI'], featuredOnly: true })).toBe(2);
  });
});

describe('groupProjectsByYearMonth', () => {
  it('groups and preserves order', () => {
    const groups = groupProjectsByYearMonth(filterProjects(list, initialFilterState));
    expect(groups.map((g) => g.key)).toEqual(['2025-06', '2024-03', '2022-02']);
    expect(groups[0]).toMatchObject({ year: '2025', month: 'jún' });
  });

  it('handles invalid dates', () => {
    const groups = groupProjectsByYearMonth([make({ date: 'nope' })]);
    expect(groups[0].year).toBe('Bez dátumu');
  });
});
