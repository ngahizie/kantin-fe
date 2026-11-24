import { createFileRoute } from '@tanstack/react-router'
import { KasirPosPage } from '@/features/kasir/kasir-pos-page'

export const Route = createFileRoute('/kasir/')({
  component: KasirPosPage,
})
