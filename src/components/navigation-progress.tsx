import { useEffect, useRef } from 'react'
import { useRouterState } from '@tanstack/react-router'
import LoadingBar, { type LoadingBarRef } from 'react-top-loading-bar'

export function NavigationProgress() {
  const ref = useRef<LoadingBarRef>(null)
  const state = useRouterState()
  const isKasirPage =
    state.location.pathname.startsWith('/kasir') ||
    Boolean(state.resolvedLocation?.pathname?.startsWith('/kasir'))

  useEffect(() => {
    if (state.status === 'pending') {
      ref.current?.continuousStart()
    } else {
      ref.current?.complete()
    }
  }, [state.status])

  return (
    <LoadingBar
      color='var(--muted-foreground)'
      ref={ref}
      shadow={!isKasirPage}
      shadowStyle={isKasirPage ? { boxShadow: 'none' } : undefined}
      height={2}
    />
  )
}
