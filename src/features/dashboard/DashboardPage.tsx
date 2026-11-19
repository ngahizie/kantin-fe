import { ShieldAlert } from 'lucide-react'
import { BackofficeHeader } from '@/components/layout/backoffice-header'
import { Main } from '@/components/layout/main'
import { useRoleStore } from '@/stores/useRoleStore'
import { PengelolaDashboard } from './components/PengelolaDashboard'
import { TuDashboard } from './components/TuDashboard'
import { BendaharaDashboard } from './components/BendaharaDashboard'
import { AdminDashboard } from './components/AdminDashboard'
import { KepsekDashboard } from './components/KepsekDashboard'
import {
  getStatusBadgeClass,
  formatRupiah,
  getLast7Days,
  type DynamicCategory,
  type ChartDayItem,
  type RecentTransactionDisplayItem,
} from './dashboard-utils'

export {
  getStatusBadgeClass,
  formatRupiah,
  getLast7Days,
  type DynamicCategory,
  type ChartDayItem,
  type RecentTransactionDisplayItem,
}

export function DashboardPage() {
  const { currentRole } = useRoleStore()

  const renderDashboardByRole = () => {
    switch (currentRole) {
      case 'pengelola':
        return <PengelolaDashboard />
      case 'tu':
        return <TuDashboard />
      case 'bendahara':
        return <BendaharaDashboard />
      case 'admin':
        return <AdminDashboard />
      case 'kepsek':
        return <KepsekDashboard />
      default:
        return (
          <div className='flex flex-col items-center justify-center py-16 text-center space-y-4' data-testid='unauthorized-role-fallback'>
            <div className='rounded-full bg-destructive/10 p-4 text-destructive'>
              <ShieldAlert className='h-8 w-8' />
            </div>
            <div className='space-y-2'>
              <h3 className='text-lg font-semibold tracking-tight'>Akses Tidak Dikenal</h3>
              <p className='text-sm text-muted-foreground max-w-sm'>
                Peran akun Anda tidak memiliki izin untuk melihat dashboard ini.
              </p>
            </div>
          </div>
        )
    }
  }

  return (
    <>
      {/* Top Header Shell dengan breadcrumb, sekolah, modul status, search & profil */}
      <BackofficeHeader />

      <Main className='space-y-6'>
        {renderDashboardByRole()}
      </Main>
    </>
  )
}

export default DashboardPage
