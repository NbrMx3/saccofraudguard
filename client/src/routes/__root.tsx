import { createRootRoute, Outlet } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/context/AuthContext'
import { ThemeProvider } from '@/context/ThemeContext'

const TanStackRouterDevtools =
  import.meta.env.PROD
    ? () => null
    : lazy(() =>
        import('@tanstack/router-devtools').then((res) => ({
          default: res.TanStackRouterDevtools,
        }))
      )

export const Route = createRootRoute({
  component: () => (
    <ThemeProvider>
      <AuthProvider>
        <Outlet />
        <Toaster
          position="top-right"
          toastOptions={{
            className: '!bg-slate-800 !text-white !border !border-white/10',
            duration: 4000,
          }}
        />
        <Suspense>
          <TanStackRouterDevtools />
        </Suspense>
      </AuthProvider>
    </ThemeProvider>
  ),
})
