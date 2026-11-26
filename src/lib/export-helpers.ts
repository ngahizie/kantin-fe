import { useAuthStore } from '@/stores/auth-store'
import { SCHOOL_LOGO_BASE64, getSchoolLogoBase64 } from '@/assets/schoolLogoBase64'

export { SCHOOL_LOGO_BASE64 } from '@/assets/schoolLogoBase64'

interface SchoolProfile {
  name: string
  address: string
  logoBase64: string
}

/**
 * Mengambil informasi sekolah aktif dari auth store dengan fallback yang aman
 */
export function getSchoolProfile(): SchoolProfile {
  try {
    const user = useAuthStore.getState().auth.user
    const sekolahId = user?.sekolahId
    const name = user?.sekolahNama || 'SMP NEGERI 1 SKOOLIA'
    const address =
      sekolahId === 10 || /10/.test(name)
        ? 'Jl. Diponegoro No. 10, Lingkungan Pendidikan SKOOLIA'
        : 'Jl. Merdeka No. 1, Lingkungan Pendidikan SKOOLIA'
    const logoBase64 = getSchoolLogoBase64(sekolahId, name)
    return { name, address, logoBase64 }
  } catch {
    return {
      name: 'SMP NEGERI 1 SKOOLIA',
      address: 'Jl. Merdeka No. 1, Lingkungan Pendidikan SKOOLIA',
      logoBase64: SCHOOL_LOGO_BASE64,
    }
  }
}

/**
 * Menghapus embel-embel "Kantin Skoolia" dari judul, subjudul, atau catatan
 */
export function stripKantinSkoolia(text?: string | null): string {
  if (!text) return ''
  return text
    .replace(/\s*[-–—:]?\s*kantin\s+skoolia\b/gi, '')
    .replace(/\bkantin\s+skoolia\s*[-–—:]?\s*/gi, '')
    .replace(/^[-–—:\s]+|[-–—:\s]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}
