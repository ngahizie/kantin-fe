import * as React from 'react'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

type TeamSwitcherProps = {
  teams: {
    name: string
    logo: React.ElementType | string
    plan: string
  }[]
}

export function TeamSwitcher({ teams }: TeamSwitcherProps) {
  const activeTeam = teams[0]

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size='lg'
          className='hover:bg-transparent active:bg-transparent cursor-default select-none'
        >
          <div
            className={`flex aspect-square size-8 items-center justify-center rounded-lg overflow-hidden ${
              typeof activeTeam.logo === 'string'
                ? 'bg-muted dark:bg-white p-1'
                : 'bg-sidebar-primary text-sidebar-primary-foreground'
            }`}
          >
            {typeof activeTeam.logo === 'string' ? (
              <img
                src={activeTeam.logo}
                alt={activeTeam.name}
                className='size-full object-contain'
              />
            ) : (
              <activeTeam.logo className='size-4' />
            )}
          </div>
          <div className='grid flex-1 text-start text-sm leading-tight'>
            <span className='truncate font-semibold'>
              {activeTeam.name}
            </span>
            <span className='truncate text-xs text-muted-foreground'>{activeTeam.plan}</span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
