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
        return <PengelolaDashboard />
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
