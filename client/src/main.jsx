import '@fontsource-variable/bricolage-grotesque/wght.css';
import '@fontsource/anton/latin-400.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, Navigate } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { AppSplash, RootLayout } from './components/layout/RootLayout.jsx';
import { RouteError } from './components/layout/RouteError.jsx';
import { GuestOnly, RequireAuth } from './components/RequireAuth.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { PreferencesProvider } from './context/PreferencesContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import HomePage from './pages/HomePage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

/** Pagina caricata solo quando serve (code splitting per rotta), con un eventuale guard. */
function lazyPage(load, Guard) {
  return async () => {
    const { default: Page } = await load();
    if (!Guard) return { Component: Page };
    return {
      Component: function GuardedPage() {
        return (
          <Guard>
            <Page />
          </Guard>
        );
      },
    };
  };
}

const router = createBrowserRouter([
  {
    path: '/',
    Component: RootLayout,
    HydrateFallback: AppSplash,
    ErrorBoundary: RouteError,
    children: [
      {
        // Rotta senza percorso: gli errori di una pagina restano dentro il layout (header visibile).
        ErrorBoundary: RouteError,
        children: [
          { index: true, Component: HomePage },
          { path: 'play', lazy: lazyPage(() => import('./pages/PlayPage.jsx')) },
          { path: 'leaderboard', lazy: lazyPage(() => import('./pages/LeaderboardPage.jsx')) },
          { path: 'history', lazy: lazyPage(() => import('./pages/HistoryPage.jsx'), RequireAuth) },
          { path: 'login', lazy: lazyPage(() => import('./pages/LoginPage.jsx'), GuestOnly) },
          { path: 'register', lazy: lazyPage(() => import('./pages/RegisterPage.jsx'), GuestOnly) },
          // Indirizzo della versione precedente dell'app.
          { path: 'match', element: <Navigate to="/play" replace /> },
          { path: '*', Component: NotFoundPage },
        ],
      },
    ],
  },
]);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PreferencesProvider>
      <ToastProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </ToastProvider>
    </PreferencesProvider>
  </StrictMode>,
);
