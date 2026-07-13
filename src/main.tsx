import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import './index.css';
import { syncThemeStore } from './theme';

syncThemeStore();

const nav = navigator as Navigator & { deviceMemory?: number };
if ((nav.deviceMemory && nav.deviceMemory <= 4) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.documentElement.classList.add('perf-lite');
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 180_000,
      gcTime: 600_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
);