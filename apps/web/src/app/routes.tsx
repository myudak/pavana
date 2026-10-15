import { lazy } from 'react';
import { Navigate, type RouteObject } from 'react-router';
import { InfoPage } from '@/features/info/InfoPage';
import { TodayPage } from '@/features/today/TodayPage';
import { AppShell } from './layout/AppShell';
import { NotFoundPage } from './NotFoundPage';

// MapLibre and Recharts are heavy — load those routes on demand.
const MapPage = lazy(() => import('@/features/map/MapPage'));
const ForecastPage = lazy(() => import('@/features/forecast/ForecastPage'));

export const routes: RouteObject[] = [
  {
    element: <AppShell />,
    children: [
      { index: true, element: <TodayPage /> },
      { path: 'peta', element: <MapPage /> },
      { path: 'prakiraan', element: <ForecastPage /> },
      // Old route name, kept for existing links.
      { path: 'insight', element: <Navigate to="/prakiraan" replace /> },
      { path: 'info', element: <InfoPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
