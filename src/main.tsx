import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import RootRouter from './RootRouter.tsx';
import './index.css';

const nativeFetch = window.fetch.bind(window);
window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
  const urlString =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

  if (urlString.includes('/api/listings?')) {
    const url = new URL(urlString, window.location.origin);

    if (url.pathname === '/api/listings') {
      const pageSize = window.innerWidth < 768 ? '18' : '24';
      url.searchParams.set('pageSize', pageSize);

      if (input instanceof Request) {
        return nativeFetch(new Request(url.toString(), input));
      }

      return nativeFetch(url.toString(), init);
    }
  }

  return nativeFetch(input as RequestInfo, init);
}) as typeof window.fetch;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootRouter />
  </StrictMode>,
);
