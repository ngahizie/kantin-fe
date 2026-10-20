import { createContext, useContext, useEffect, useMemo } from 'react'
import { DirectionProvider as RdxDirProvider } from '@radix-ui/react-direction'

export type Direction = 'ltr'

const DEFAULT_DIRECTION: Direction = 'ltr'

type DirectionContextType = {
  defaultDir: Direction
  dir: Direction
  setDir: (dir: Direction) => void
  resetDir: () => void
}

const DirectionContext = createContext<DirectionContextType | null>(null)

export function DirectionProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.setAttribute('dir', 'ltr')
  }, [])

  const contextValue: DirectionContextType = useMemo(() => ({
    defaultDir: DEFAULT_DIRECTION,
    dir: DEFAULT_DIRECTION,
    setDir: () => null,
    resetDir: () => null,
  }), [])

  return (
    <DirectionContext value={contextValue}>
      <RdxDirProvider dir='ltr'>{children}</RdxDirProvider>
    </DirectionContext>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDirection() {
  const context = useContext(DirectionContext)
  if (!context) {
    throw new Error('useDirection must be used within a DirectionProvider')
  }
  return context
}
