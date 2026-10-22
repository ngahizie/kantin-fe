import { create } from 'zustand'

export type UserRole = 'admin' | 'pengelola' | 'tu' | 'bendahara' | 'kasir' | 'kepsek'

export interface RoleConfig {
  id: UserRole
  label: string
  description: string
  badgeColor: string
}

export const ROLE_CONFIGS: Record<UserRole, RoleConfig> = {
  admin: {
    id: 'admin',
    label: 'Admin Sekolah',
    description: 'Akses administrasi sistem, kontrol kartu siswa, dan pelaporan keuangan',
    badgeColor: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800',
  },
  kepsek: {
    id: 'kepsek',
    label: 'Kepala Sekolah',
    description: 'Akses pemantauan dan laporan eksekutif kantin sekolah',
    badgeColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
  },
  pengelola: {
    id: 'pengelola',
    label: 'Pengelola Kantin',
    description: 'Manajemen katalog menu, restock, dan opname inventaris',
    badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  },
  tu: {
    id: 'tu',
    label: 'Petugas TU',
    description: 'Layanan top-up tunai siswa & operasional kartu tamu',
    badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  },
  bendahara: {
    id: 'bendahara',
    label: 'Bendahara Sekolah',
    description: 'Rekonsiliasi saldo kas, mutasi koreksi, dan laporan keuangan',
    badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800',
  },
  kasir: {
    id: 'kasir',
    label: 'Petugas Kasir POS',
    description: 'Operasional layar kasir POS dan transaksi RFID harian',
    badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  },
}

function getStoredUser() {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('kantin_user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

interface RoleStoreState {
  currentRole: UserRole
  schoolName: string
  canteenName: string
  moduleStatus: 'ONLINE' | 'STANDALONE' | 'MAINTENANCE'
  userName: string
  userEmail: string
  setRole: (role: UserRole) => void
  setModuleStatus: (status: 'ONLINE' | 'STANDALONE' | 'MAINTENANCE') => void
  setSchoolName: (name: string) => void
  setUserName: (name: string) => void
  setUserEmail: (email: string) => void
}

const storedUser = getStoredUser()

export const useRoleStore = create<RoleStoreState>((set) => ({
  currentRole: (storedUser?.currentRole as UserRole) || 'admin',
  schoolName: storedUser?.sekolahNama || 'PAUD SKOOLIA',
  canteenName: 'Kantin SKOOLIA',
  moduleStatus: 'ONLINE',
  userName: storedUser?.nama || '',
  userEmail: storedUser?.email || '',
  setRole: (role) => set({ currentRole: role }),
  setModuleStatus: (status) => set({ moduleStatus: status }),
  setSchoolName: (name) => set({ schoolName: name }),
  setUserName: (name) => set({ userName: name }),
  setUserEmail: (email) => set({ userEmail: email }),
}))
