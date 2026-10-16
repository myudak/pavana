import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { AppShell } from '@/app/layout/AppShell';
import { AppProviders, createQueryClient } from '@/app/providers';

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <div>Hari Ini</div> },
          { path: 'peta', element: <div>Peta</div> },
          { path: 'insight', element: <div>Insight</div> },
          { path: 'info', element: <div>Info</div> },
        ],
      },
    ],
    { initialEntries: [path] },
  );
  return render(
    <AppProviders queryClient={createQueryClient()}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
}

describe('Top bar nav', () => {
  it('marks the current destination active on both desktop and mobile navs', async () => {
    renderAt('/');
    const todayLinks = await screen.findAllByRole('link', { name: 'Home' });
    // Desktop top bar + mobile bottom tab bar.
    expect(todayLinks.length).toBeGreaterThanOrEqual(2);
    for (const link of todayLinks) {
      expect(link).toHaveAttribute('aria-current', 'page');
    }
    const mapLinks = await screen.findAllByRole('link', { name: 'Peta' });
    for (const link of mapLinks) {
      expect(link).not.toHaveAttribute('aria-current', 'page');
    }
  });

  it('shows the bottom tab bar on the map route with Peta active', async () => {
    renderAt('/peta');
    // The map keeps its own top chrome, but the bottom tab bar stays like other pages.
    const navs = await screen.findAllByRole('navigation', { name: 'Navigasi utama' });
    expect(navs.length).toBeGreaterThanOrEqual(1);
    const mapLinks = await screen.findAllByRole('link', { name: 'Peta' });
    expect(mapLinks.length).toBeGreaterThanOrEqual(1);
    for (const link of mapLinks) {
      expect(link).toHaveAttribute('aria-current', 'page');
    }
  });

  it('renders a functional notification bell (no fake disabled state)', async () => {
    renderAt('/');
    const bells = await screen.findAllByRole('button', { name: /Notifikasi/ });
    expect(bells.length).toBeGreaterThanOrEqual(1);
    for (const bell of bells) {
      expect(bell).not.toHaveAttribute('aria-disabled', 'true');
    }
  });

  it('shows the location pill trigger', async () => {
    renderAt('/');
    // Desktop header pill (hidden on mobile) + compact mobile row pill.
    const pills = await screen.findAllByRole('button', { name: 'Sungai Raya' });
    expect(pills.length).toBeGreaterThanOrEqual(2);
  });
});
