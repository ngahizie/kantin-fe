import { createContext, useContext, useMemo } from 'react'

export type Collapsible = 'icon' | 'offcanvas' | 'none'
type Variant = 'sidebar'

// Default values: variant sidebar, layout default (expanded)
const DEFAULT_VARIANT: Variant = 'sidebar'
const DEFAULT_COLLAPSIBLE: Collapsible = 'icon'

type LayoutContextType = {
  resetLayout: () => void
  defaultCollapsible: Collapsible
  collapsible: Collapsible
  setCollapsible: (collapsible: Collapsible) => void
  defaultVariant: Variant
  variant: Variant
  setVariant: (variant: Variant) => void
}

const LayoutContext = createContext<LayoutContextType | null>(null)

type LayoutProviderProps = {
  children: React.ReactNode
}

export function LayoutProvider({ children }: LayoutProviderProps) {
  const contextValue: LayoutContextType = useMemo(() => ({
    resetLayout: () => null,
    defaultCollapsible: DEFAULT_COLLAPSIBLE,
    collapsible: DEFAULT_COLLAPSIBLE,
    setCollapsible: () => null,
    defaultVariant: DEFAULT_VARIANT,
    variant: DEFAULT_VARIANT,
    setVariant: () => null,
  }), [])

  return <LayoutContext value={contextValue}>{children}</LayoutContext>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLayout() {
  const context = useContext(LayoutContext)
  if (!context) {
    throw new Error('useLayout must be used within a LayoutProvider')
  }
  return context
}
