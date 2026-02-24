import { createFileRoute } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'

const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'))

export const Route = createFileRoute('/forgot-password')({
  component: () => (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-slate-950"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div></div>}>
      <ForgotPasswordPage />
    </Suspense>
  ),
})
