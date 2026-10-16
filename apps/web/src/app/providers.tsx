import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { LocationProvider } from '@/features/location/location-context';
import { DemoModeProvider } from '@/lib/demo-mode';
import { NotificationsProvider } from '@/lib/notifications';
import { ThemeProvider } from '@/lib/theme-context';

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}

export function AppProviders({
  children,
  queryClient,
}: {
  children: ReactNode;
  queryClient?: QueryClient;
}) {
  const [client] = useState(() => queryClient ?? createQueryClient());
  return (
    <QueryClientProvider client={client}>
      <DemoModeProvider>
        <ThemeProvider>
          <LocationProvider>
            <NotificationsProvider>{children}</NotificationsProvider>
          </LocationProvider>
        </ThemeProvider>
      </DemoModeProvider>
    </QueryClientProvider>
  );
}
