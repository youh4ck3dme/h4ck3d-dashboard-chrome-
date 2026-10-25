import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { App } from './App';
import { projects } from './data/projects';

describe('App', () => {
  it('renders the timeline with all static projects', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'H4CK3D Project Timeline' })).toBeInTheDocument();
    expect(screen.getByText('Total projects').previousSibling).toHaveTextContent(String(projects.length));
  });

  it('filters by search and shows the empty state', () => {
    render(<App />);
    const search = screen.getByRole('searchbox', { name: 'Jump to project' });
    fireEvent.change(search, { target: { value: 'zzzz-no-match' } });
    expect(screen.getByText('No projects match these filters.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear all filters' }));
    expect(screen.queryByText('No projects match these filters.')).not.toBeInTheDocument();
  });

  it('opens the inspector when a project is selected', () => {
    render(<App />);
    const first = projects.find((p) => p.featured)!;
    fireEvent.click(screen.getAllByRole('button', { name: `Open ${first.name}` })[0]);
    const inspector = screen.getByRole('complementary', { name: `${first.name} detail` });
    expect(within(inspector).getByText(first.businessPurpose)).toBeInTheDocument();
  });
});
