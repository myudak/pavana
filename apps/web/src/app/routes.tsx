import { lazy } from 'react';
import type { RouteObject } from 'react-router';
import { InfoPage } from '@/features/info/InfoPage';
import { TodayPage } from '@/features/today/TodayPage';
import { AppShell } from './layout/AppShell';
import { NotFoundPage } from './NotFoundPage';

// MapLibre and Recharts are heavy — load those routes on demand.
const MapPage = lazy(() => import('@/features/map/MapPage'));
const InsightsPage = lazy(() => import('@/features/insights/InsightsPage'));

export const routes: RouteObject[] = [
  {
    element: <AppShell />,
    children: [
      { index: true, element: <TodayPage /> },
      { path: 'peta', element: <MapPage /> },
      { path: 'insight', element: <InsightsPage /> },
      { path: 'info', element: <InfoPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
