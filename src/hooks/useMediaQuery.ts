import { useSyncExternalStore } from 'react'

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', notify)
      return () => mql.removeEventListener('change', notify)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

export const useIsDesktop = (): boolean => useMediaQuery('(min-width: 1024px)')
export const useIsMobile = (): boolean => useMediaQuery('(max-width: 639px)')
