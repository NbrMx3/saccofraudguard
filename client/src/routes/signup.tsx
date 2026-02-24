import { createFileRoute } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'

const SignupPage = lazy(() => import('@/pages/auth/SignupPage'))

export const Route = createFileRoute('/signup')({
  component: () => (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-[#0a1628]"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-500"></div></div>}>
      <SignupPage />
    </Suspense>
  ),
})
