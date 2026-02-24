import { createFileRoute } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'

const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage'))

export const Route = createFileRoute('/reset-password')({
  validateSearch: (search: Record<string, unknown>) => ({
    token: (search.token as string) || '',
  }),
  component: () => (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-[#0a1628]"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-500"></div></div>}>
      <ResetPasswordPage />
    </Suspense>
  ),
})
