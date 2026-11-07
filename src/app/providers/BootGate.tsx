import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { APP_CONFIG } from '@/app/config'
import { SplashScreen } from '@/components/feedback/SplashScreen'
import { initializeApp } from '../bootstrap/appInitializer'

type Phase = 'loading' | 'revealed' | 'done'

const alreadyShown = (): boolean => {
  try { return sessionStorage.getItem(APP_CONFIG.splashSessionKey) === '1' } catch { return false }
}

/**
 * Controla el arranque: muestra el loader (mínimo 3000 ms) una vez por sesión de navegación y
 * monta la aplicación únicamente cuando la animación terminó, para que nunca se vea una pantalla
 * del sistema antes de tiempo. La app queda montada debajo mientras el overlay se desvanece.
 */
export function BootGate({ children }: { children: ReactNode }) {
  // Se evalúa una sola vez: marcar la sesión como «vista» no debe alterar este arranque.
  const [skipSplash] = useState(alreadyShown)
  const [phase, setPhase] = useState<Phase>(skipSplash ? 'done' : 'loading')
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    let active = true
    initializeApp()
      .catch(() => undefined)
      .finally(() => { if (active) setInitialized(true) })
    return () => { active = false }
  }, [])

  const onReveal = useCallback(() => {
    try { sessionStorage.setItem(APP_CONFIG.splashSessionKey, '1') } catch { /* noop */ }
    setPhase((p) => (p === 'loading' ? 'revealed' : p))
  }, [])
  const onExited = useCallback(() => setPhase('done'), [])

  if (skipSplash) return initialized ? <>{children}</> : <div className="min-h-screen bg-canvas" aria-hidden />

  return (
    <>
      {phase !== 'loading' && children}
      {phase !== 'done' && (
        <SplashScreen ready={initialized} onReveal={onReveal} onExited={onExited} />
      )}
    </>
  )
}
