import { useMemo } from 'react'
import {
  Sidebar as ShadcnSidebar,
  SidebarContent,
  SidebarHeader,
} from '@/components/ui/sidebar'
import { useRoleStore } from '@/stores/useRoleStore'
import { sidebarData } from '@/components/layout/data/sidebar-data'
import { filterNavGroupsByRole } from '@/components/layout/nav-utils'
import { NavGroup } from '@/components/layout/nav-group'
import { TeamSwitcher } from '@/components/layout/team-switcher'

export interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const { currentRole, schoolName, canteenName } = useRoleStore()

  // Filter navigasi sidebar dinamis sesuai role yang sedang aktif
  const filteredNavGroups = useMemo(() => {
    return filterNavGroupsByRole(sidebarData.navGroups, currentRole)
  }, [currentRole])

  const teams = [
    {
      name: canteenName || 'Kantin SKOOLIA',
      logo: sidebarData.teams[0].logo,
      plan: schoolName || 'PAUD SKOOLIA',
    },
  ]

  return (
    <ShadcnSidebar variant='sidebar' className={className}>
      <SidebarHeader className='h-[65px] justify-center border-b border-sidebar-border/50'>
        <TeamSwitcher teams={teams} />
      </SidebarHeader>

      <SidebarContent>
        {filteredNavGroups.map((props) => (
          <NavGroup key={props.title} {...props} />
        ))}
      </SidebarContent>
    </ShadcnSidebar>
  )
}

export default Sidebar
