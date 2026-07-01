import { createFileRoute } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
import RequireAuth from '@/components/auth/RequireAuth'

const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'))
const DASHBOARD_ROLES = ['ADMIN', 'OFFICER', 'AUDITOR'] as const

export const Route = createFileRoute('/dashboard')({
  component: () => (
    <RequireAuth allowedRoles={DASHBOARD_ROLES}>
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-[#0a1628]"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-500"></div></div>}>
        <DashboardPage />
      </Suspense>
    </RequireAuth>
  ),
})
