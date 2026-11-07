import { zodResolver } from '@hookform/resolvers/zod'
import { Download, Monitor, Moon, RotateCcw, Sun, Trash2, Sparkles } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { APP_CONFIG } from '@/app/config'
import { PageHeader } from '@/components/common/PageHeader'
import { PasswordInput } from '@/components/common/PasswordInput'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Field, Input, Select } from '@/components/ui/Field'
import { Switch } from '@/components/ui/Switch'
import { ServiceError, services } from '@/services'
import { useAuthStore } from '@/stores/authStore'
import { useDataStore } from '@/stores/dataStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useUiStore } from '@/stores/uiStore'
import type { CurrencyCode, PeriodKey, ThemeMode } from '@/types/domain'
import { cn } from '@/utils/cn'
import { downloadText } from '@/utils/csv'
import { PERIODS, todayISO } from '@/utils/dates'
import { CURRENCIES, formatMoney, initials } from '@/utils/format'
import { notify } from '@/utils/notify'
import { passwordRule } from '../auth/schemas'

function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="grid gap-6 border-t border-line py-8 first:border-t-0 first:pt-0 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-12">
      <div><h2 className="text-base font-bold text-ink">{title}</h2><p className="mt-1 text-[13px] leading-relaxed text-ink-2">{description}</p></div>
      <div className="min-w-0">{children}</div>
    </section>
  )
}

const THEMES: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Claro', icon: Sun }, { value: 'dark', label: 'Oscuro', icon: Moon }, { value: 'system', label: 'Sistema', icon: Monitor },
]

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Ingresa tu nombre.').max(60, 'Máximo 60 caracteres.'),
  email: z.string().trim().min(1, 'Ingresa tu correo.').pipe(z.email('Ingresa un correo válido.')),
})
const passSchema = z.object({ current: z.string().min(1, 'Ingresa tu contraseña actual.'), next: passwordRule })

function ProfileForm() {
  const user = useAuthStore((s) => s.user)
  const updateProfile = useAuthStore((s) => s.updateProfile)
  const { register, handleSubmit, setError, formState: { errors, isSubmitting, isDirty } } = useForm({ resolver: zodResolver(profileSchema), defaultValues: { name: user?.name ?? '', email: user?.email ?? '' } })
  const submit = handleSubmit(async (v) => {
    try { await updateProfile(v); notify.success('Perfil actualizado') } catch (e) {
      if (e instanceof ServiceError && e.field === 'email') setError('email', { message: e.message }); else notify.error(e)
    }
  })
  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-4" noValidate>
      <div className="mb-2 flex items-center gap-4">
        <span className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-brand to-[#7DB4FF] font-display text-xl font-extrabold text-white">{initials(user?.name ?? '?')}</span>
        <div><p className="text-base font-bold text-ink">{user?.name}</p><p className="text-[13px] text-ink-2">{user?.email}</p></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" htmlFor="pf-name" error={errors.name?.message}><Input id="pf-name" invalid={!!errors.name} {...register('name')} /></Field>
        <Field label="Correo" htmlFor="pf-email" error={errors.email?.message}><Input id="pf-email" type="email" invalid={!!errors.email} {...register('email')} /></Field>
      </div>
      <Button type="submit" variant="primary" loading={isSubmitting} disabled={!isDirty}>Guardar perfil</Button>
    </form>
  )
}

function PasswordForm() {
  const user = useAuthStore((s) => s.user)
  const { register, handleSubmit, setError, reset, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(passSchema), defaultValues: { current: '', next: '' } })
  const submit = handleSubmit(async (v) => {
    if (!user) return
    try { await services.auth.changePassword(user.id, v.current, v.next); notify.success('Contraseña actualizada'); reset() } catch (e) {
      if (e instanceof ServiceError && (e.field === 'current' || e.field === 'next')) setError(e.field, { message: e.message }); else notify.error(e)
    }
  })
  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Contraseña actual" htmlFor="pw-cur" error={errors.current?.message}><PasswordInput id="pw-cur" autoComplete="current-password" invalid={!!errors.current} {...register('current')} /></Field>
        <Field label="Nueva contraseña" htmlFor="pw-new" error={errors.next?.message} hint="Mínimo 8 caracteres, con letra y número."><PasswordInput id="pw-new" autoComplete="new-password" invalid={!!errors.next} {...register('next')} /></Field>
      </div>
      <Button type="submit" variant="secondary" loading={isSubmitting}>Cambiar contraseña</Button>
    </form>
  )
}

export default function SettingsPage() {
  const settings = useSettingsStore((s) => s.settings)
  const update = useSettingsStore((s) => s.update)
  const setPeriod = useUiStore((s) => s.setPeriod)
  const user = useAuthStore((s) => s.user)
  const resetDemo = useDataStore((s) => s.resetDemo)
  const clearMovements = useDataStore((s) => s.clearMovements)
  const [dialog, setDialog] = useState<null | 'reset' | 'clear'>(null)
  const isDemo = user?.email === APP_CONFIG.demoCredentials.email

  async function exportData(): Promise<void> {
    if (!user) return
    try { downloadText(`moniq-datos-${todayISO()}.json`, await services.data.exportJSON(user.id)); notify.success('Datos exportados') } catch (e) { notify.error(e) }
  }

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Cuenta" title="Configuración" description="Personaliza tu perfil, la apariencia y las preferencias de visualización." />
      <div className="panel px-5 py-8 sm:px-8">
        <Section title="Perfil" description="Tu nombre y correo se muestran en el menú y en los saludos."><ProfileForm /></Section>

        <Section title="Apariencia" description="Elige el tema. «Sistema» sigue la preferencia de tu dispositivo.">
          <div role="radiogroup" aria-label="Tema" className="grid max-w-xl grid-cols-3 gap-3">
            {THEMES.map(({ value, label, icon: Icon }) => {
              const active = settings.theme === value
              return (
                <button key={value} role="radio" aria-checked={active} onClick={() => update({ theme: value })} className={cn('group rounded-2xl border p-2.5 text-left transition-all', active ? 'border-brand ring-4 ring-brand/15' : 'border-line hover:border-line-strong')}>
                  <div className={cn('mb-2.5 flex h-16 items-end gap-1.5 overflow-hidden rounded-xl p-2', value === 'dark' ? 'bg-[#0C162C]' : value === 'light' ? 'bg-[#EEF1F7]' : 'bg-gradient-to-r from-[#EEF1F7] to-[#0C162C]')}>
                    <span className="h-5 w-2.5 rounded bg-[#2F6BFF]" /><span className="h-8 w-2.5 rounded bg-[#19B98A]" /><span className="h-3 w-2.5 rounded bg-[#E84E44]" />
                  </div>
                  <span className="flex items-center gap-1.5 px-1 text-[13px] font-semibold text-ink"><Icon className="h-3.5 w-3.5" />{label}</span>
                </button>
              )
            })}
          </div>
        </Section>

        <Section title="Región y formato" description="La moneda cambia el símbolo y el formato; no convierte tus importes.">
          <div className="grid max-w-xl gap-5 sm:grid-cols-2">
            <Field label="Moneda" htmlFor="st-cur" hint={`Vista previa: ${formatMoney(12450.5, settings.currency)}`}>
              <Select id="st-cur" value={settings.currency} onChange={(e) => update({ currency: e.target.value as CurrencyCode })}>
                {Object.entries(CURRENCIES).map(([code, c]) => <option key={code} value={code}>{c.symbol} · {c.label}</option>)}
              </Select>
            </Field>
            <Field label="Periodo predeterminado" htmlFor="st-per" hint="Se aplica al abrir la aplicación.">
              <Select id="st-per" value={settings.defaultPeriod} onChange={(e) => { const p = e.target.value as PeriodKey; update({ defaultPeriod: p }); setPeriod(p) }}>
                {PERIODS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
              </Select>
            </Field>
          </div>
          <div className="mt-5 max-w-xl space-y-3">
            {[
              { label: 'Abreviar importes grandes', text: 'Muestra 12.4 mil en tarjetas y gráficos (los detalles siempre muestran el monto exacto).', value: settings.compactNumbers, onChange: (v: boolean) => update({ compactNumbers: v }) },
              { label: 'Iniciar con el menú contraído', text: 'Más espacio para el contenido en escritorio.', value: settings.sidebarCollapsed, onChange: (v: boolean) => update({ sidebarCollapsed: v }) },
            ].map((o) => (
              <div key={o.label} className="flex items-center justify-between gap-4 rounded-xl border border-line p-3.5">
                <div><p className="text-[13.5px] font-semibold text-ink">{o.label}</p><p className="text-[12.5px] text-ink-2">{o.text}</p></div>
                <Switch checked={o.value} onChange={o.onChange} label={o.label} />
              </div>
            ))}
          </div>
        </Section>

        <Section title="Seguridad" description="Actualiza tu contraseña de acceso."><PasswordForm /></Section>

        <Section title="Datos" description="Todo se guarda en este navegador (localStorage). No hay servidor ni base de datos.">
          <div className="max-w-xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-3.5">
              <div><p className="text-[13.5px] font-semibold text-ink">Exportar mis datos</p><p className="text-[12.5px] text-ink-2">Descarga categorías, conceptos, movimientos y presupuestos en JSON.</p></div>
              <Button variant="secondary" size="sm" onClick={() => void exportData()}><Download className="h-4 w-4" /> Exportar</Button>
            </div>
            {isDemo && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-3.5">
                <div><p className="text-[13.5px] font-semibold text-ink">Restaurar datos de demostración</p><p className="text-[12.5px] text-ink-2">Vuelve al conjunto original de 12 meses de movimientos.</p></div>
                <Button variant="secondary" size="sm" onClick={() => setDialog('reset')}><RotateCcw className="h-4 w-4" /> Restaurar</Button>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-3.5">
              <div><p className="text-[13.5px] font-semibold text-ink">Vaciar movimientos</p><p className="text-[12.5px] text-ink-2">Elimina todos los movimientos (borrado lógico, recuperables desde el historial).</p></div>
              <Button variant="dangerSoft" size="sm" onClick={() => setDialog('clear')}><Trash2 className="h-4 w-4" /> Vaciar</Button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-3.5">
              <div><p className="text-[13.5px] font-semibold text-ink">Ver pantalla de bienvenida</p><p className="text-[12.5px] text-ink-2">Recarga la aplicación y repite la animación inicial de 3 segundos.</p></div>
              <Button variant="secondary" size="sm" onClick={() => { sessionStorage.removeItem(APP_CONFIG.splashSessionKey); window.location.reload() }}><Sparkles className="h-4 w-4" /> Ver</Button>
            </div>
          </div>
        </Section>
      </div>

      <ConfirmDialog
        open={dialog === 'reset'} onOpenChange={(o) => !o && setDialog(null)} tone="default" title="¿Restaurar los datos de demostración?" confirmLabel="Restaurar"
        description="Perderás los cambios que hayas hecho en categorías, conceptos, movimientos y presupuestos."
        onConfirm={async () => { try { await resetDemo(); notify.success('Datos de demostración restaurados') } catch (e) { notify.error(e); throw e } }}
      />
      <ConfirmDialog
        open={dialog === 'clear'} onOpenChange={(o) => !o && setDialog(null)} title="¿Vaciar todos los movimientos?" confirmLabel="Vaciar movimientos"
        description="Tus indicadores volverán a cero. Podrás restaurar movimientos individuales desde Historial → Eliminados."
        onConfirm={async () => { try { await clearMovements(); notify.success('Movimientos eliminados') } catch (e) { notify.error(e); throw e } }}
      />
    </div>
  )
}
