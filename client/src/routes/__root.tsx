import { createRootRoute, Outlet } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
import { Toaster } from 'sonner'
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
          theme="dark"
          richColors
          toastOptions={{
            className: 'bg-slate-800 text-white border border-white/10',
          }}
        />
        <Suspense>
          <TanStackRouterDevtools />
        </Suspense>
      </AuthProvider>
    </ThemeProvider>
  ),
})
