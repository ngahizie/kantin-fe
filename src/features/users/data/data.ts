import { Shield, UserCheck, Users, CreditCard } from 'lucide-react'
import { type UserStatus } from './schema'

export const callTypes = new Map<UserStatus, string>([
  [
    'active',
    'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-900/60',
  ],
  ['inactive', 'text-muted-foreground bg-muted/50 border-border'],
  [
    'invited',
    'text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-950/40 dark:border-blue-900/60',
  ],
  [
    'suspended',
    'text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-300 dark:bg-rose-950/40 dark:border-rose-900/60',
  ],
])

export const statusLabels: Record<UserStatus, string> = {
  active: 'Aktif',
  inactive: 'Nonaktif',
  invited: 'Diundang',
  suspended: 'Ditangguhkan',
}

export const roles = [
  {
    label: 'Superadmin',
    value: 'superadmin',
    icon: Shield,
  },
  {
    label: 'Admin',
    value: 'admin',
    icon: UserCheck,
  },
  {
    label: 'Manajer',
    value: 'manager',
    icon: Users,
  },
  {
    label: 'Kasir',
    value: 'cashier',
    icon: CreditCard,
  },
] as const
