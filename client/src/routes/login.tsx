import { createFileRoute } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'

const LoginPage = lazy(() => import('@/pages/auth/LoginPage'))

export const Route = createFileRoute('/login')({
  component: () => (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-slate-950"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div></div>}>
      <LoginPage />
    </Suspense>
  ),
})
