import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { App } from './App';
import { projects } from './data/projects';
import { t, projectCount } from './lib/i18n';

const productionCount = projects.filter((p) => p.status === 'Production').length;
const inProgressCount = projects.filter((p) => p.status === 'In Progress').length;

function cardNames(): string[] {
  return screen
    .getAllByRole('button', { name: /^Otvoriť / })
    .map((el) => el.getAttribute('aria-label')!.replace('Otvoriť ', ''));
}

describe('App', () => {
  it('renders the timeline with all static projects', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: t.appTitle })).toBeInTheDocument();
    expect(screen.getByText(t.stats.total).previousSibling).toHaveTextContent(String(projects.length));
  });

  it('shows every project exactly once on the default screen (F2)', () => {
    render(<App />);
    const names = cardNames();
    expect(names).toHaveLength(projects.length);
    expect(new Set(names).size).toBe(names.length);
  });

  it('has a single search input shared by every breakpoint (F4)', () => {
    render(<App />);
    expect(screen.getAllByRole('searchbox')).toHaveLength(1);
    expect(screen.getByRole('searchbox', { name: t.search.label })).toHaveAttribute(
      'aria-keyshortcuts',
      expect.stringMatching(/K/),
    );
  });

  it('filters by search, shows a visible result count and clears on Escape', () => {
    render(<App />);
    const search = screen.getByRole('searchbox', { name: t.search.label });
    fireEvent.change(search, { target: { value: 'zzzz-no-match' } });

    expect(screen.getByText(t.empty.title)).toBeInTheDocument();
    expect(screen.getByText(`0 projektov ${t.results.for('zzzz-no-match')}`)).toBeInTheDocument();

    fireEvent.keyDown(search, { key: 'Escape' });
    expect(search).toHaveValue('');
    expect(screen.queryByText(t.empty.title)).not.toBeInTheDocument();
    expect(cardNames()).toHaveLength(projects.length);
  });

  it('uses the stats row as a filter control (F9)', () => {
    render(<App />);
    const production = screen.getByRole('button', {
      name: `${t.stats.production}: ${productionCount}`,
    });
    expect(production).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(production);
    expect(production).toHaveAttribute('aria-pressed', 'true');
    expect(cardNames()).toHaveLength(productionCount);
    expect(screen.getByText(projectCount(productionCount))).toBeInTheDocument();

    fireEvent.click(production);
    expect(production).toHaveAttribute('aria-pressed', 'false');
    expect(cardNames()).toHaveLength(projects.length);
  });

  it('opens the inspector when a project is selected', () => {
    render(<App />);
    const first = projects.find((p) => p.featured)!;
    fireEvent.click(screen.getAllByRole('button', { name: t.card.openLabel(first.name) })[0]);
    const inspector = screen.getByRole('complementary', { name: t.inspector.label(first.name) });
    expect(within(inspector).getByText(first.businessPurpose)).toBeInTheDocument();
  });

  it('marks featured projects in the timeline instead of repeating them (F2)', () => {
    render(<App />);
    for (const project of projects.filter((p) => p.featured)) {
      const card = screen.getByRole('button', { name: t.card.openLabel(project.name) });
      expect(within(card).getByText(t.timeline.featured)).toBeInTheDocument();
    }
    expect(
      screen.getByRole('button', { name: `${t.stats.inProgress}: ${inProgressCount}` }),
    ).toBeInTheDocument();
  });
});
