import { useEffect, type ReactNode } from 'react'
import { Toaster } from 'sonner'
import { TooltipProvider } from '@/components/ui/Tooltip'
import { useSettingsStore } from '@/stores/settingsStore'
import { BootGate } from './BootGate'

/** Aplica la clase `dark` al <html> según el ajuste del usuario (y reacciona al tema del sistema). */
function ThemeEffect() {
  const theme = useSettingsStore((s) => s.settings.theme)
  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = (): void => {
      const dark = theme === 'dark' || (theme === 'system' && mql.matches)
      document.documentElement.classList.toggle('dark', dark)
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#060C1B' : '#0A1B3D')
    }
    apply()
    mql.addEventListener('change', apply)
    return () => mql.removeEventListener('change', apply)
  }, [theme])
  return null
}

function ThemedToaster() {
  const theme = useSettingsStore((s) => s.settings.theme)
  return (
    <Toaster
      theme={theme} position="bottom-right" closeButton offset={20} mobileOffset={16}
      toastOptions={{
        classNames: {
          toast: '!rounded-xl !border !border-line !bg-surface !text-ink !shadow-lift !font-sans',
          description: '!text-ink-2',
          actionButton: '!bg-brand !text-white !rounded-lg !font-semibold',
        },
      }}
    />
  )
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider delayDuration={120}>
      <ThemeEffect />
      <BootGate>{children}</BootGate>
      <ThemedToaster />
    </TooltipProvider>
  )
}
