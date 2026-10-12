import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AppErrorBoundary from './AppErrorBoundary';

const BrokenPage = () => {
  throw new Error('expected render failure');
};

describe('AppErrorBoundary', () => {
  it('shows a safe recovery screen instead of a blank page', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(<AppErrorBoundary><BrokenPage /></AppErrorBoundary>);

    expect(screen.getByRole('heading', { name: 'We could not load this page' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh rifKANDO' })).toBeInTheDocument();
    consoleError.mockRestore();
  });
});
