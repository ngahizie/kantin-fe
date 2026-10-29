import { useMemo } from 'react'
import {
  Sidebar as ShadcnSidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import { useLayout } from '@/context/layout-provider'
import { useRoleStore } from '@/stores/useRoleStore'
import { sidebarData } from '@/components/layout/data/sidebar-data'
import { filterNavGroupsByRole } from '@/components/layout/nav-utils'
import { NavGroup } from '@/components/layout/nav-group'
import { TeamSwitcher } from '@/components/layout/team-switcher'

export interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const { collapsible, variant } = useLayout()
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
    <ShadcnSidebar collapsible={collapsible} variant={variant} className={className}>
      <SidebarHeader className='h-[65px] justify-center border-b border-sidebar-border/50'>
        <TeamSwitcher teams={teams} />
      </SidebarHeader>

      <SidebarContent>
        {filteredNavGroups.map((props) => (
          <NavGroup key={props.title} {...props} />
        ))}
      </SidebarContent>

      <SidebarRail />
    </ShadcnSidebar>
  )
}

export default Sidebar
