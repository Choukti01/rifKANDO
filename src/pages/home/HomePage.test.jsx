import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HomePage from './HomePage';
import { getCourses, getFinditRequests, getProducts, getServices } from '/src/services/api';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: key => key }) }));
vi.mock('/src/services/api', () => ({ getProducts: vi.fn(), getFinditRequests: vi.fn(), getServices: vi.fn(), getCourses: vi.fn() }));

describe('homepage course category', () => {
  afterEach(cleanup);
  beforeEach(() => {
    vi.resetAllMocks();
    getProducts.mockResolvedValue({ data: { products: [], pagination: { total: 0 } } });
    getFinditRequests.mockResolvedValue({ data: { requests: [], pagination: { total: 0 } } });
    getServices.mockResolvedValue({ data: { services: [], pagination: { total: 0 } } });
  });

  it('renders the real course count without crashing', async () => {
    getCourses.mockResolvedValue({ data: { courses: [], pagination: { total: 7 } } });
    render(<MemoryRouter><HomePage /></MemoryRouter>);
    expect(await screen.findByText('7 availability.items')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /nav.courses/ })).toHaveAttribute('href', '/courses');
  });

  it('shows unavailable data instead of crashing when courses cannot load', async () => {
    getCourses.mockRejectedValue(new Error('offline'));
    render(<MemoryRouter><HomePage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole('link', { name: /nav.courses/ })).toHaveTextContent('availability.liveData'));
  });
});
