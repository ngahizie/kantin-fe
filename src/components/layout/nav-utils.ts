import { type NavGroup, type NavItem, type NavCollapsible, type NavLink } from './types'
import { type UserRole } from '@/stores/useRoleStore'

/**
 * Memfilter grup navigasi dan sub-item navbar berdasarkan peran (role) aktif pengguna.
 * Aturan RBAC:
 * - Setiap peran (termasuk admin) hanya melihat grup dan item yang secara eksplisit mencantumkan perannya di `roles`.
 * - Jika suatu menu collapsible memiliki sub-item, sub-item juga difilter.
 *   Jika seluruh sub-item terfilter habis, menu collapsible tersebut otomatis dihilangkan.
 * - Jika seluruh item dalam suatu grup terfilter habis, grup tersebut otomatis dihilangkan.
 */
export function filterNavGroupsByRole(
  navGroups: NavGroup[],
  role: UserRole
): NavGroup[] {
  return navGroups
    .filter((group) => {
      if (!group.roles || group.roles.length === 0) return true
      return group.roles.includes(role)
    })
    .map((group) => {
      const filteredItems: NavItem[] = group.items
        .filter((item) => {
          if (!item.roles || item.roles.length === 0) return true
          return item.roles.includes(role)
        })
        .map((item) => {
          if ('items' in item && Array.isArray(item.items)) {
            const filteredSubItems = item.items.filter((subItem) => {
              if (!subItem.roles || subItem.roles.length === 0) return true
              return subItem.roles.includes(role)
            })
            return {
              ...item,
              items: filteredSubItems,
            } as NavCollapsible
          }
          return item as NavLink
        })
        .filter((item) => {
          if ('items' in item && Array.isArray(item.items)) {
            return item.items.length > 0
          }
          return true
        })

      return {
        ...group,
        items: filteredItems,
      }
    })
    .filter((group) => group.items.length > 0)
}
