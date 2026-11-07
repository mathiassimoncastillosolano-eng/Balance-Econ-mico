import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { ArrowRight, Mail, Sparkles, User } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useLocation, useNavigate } from 'react-router-dom'
import { APP_CONFIG } from '@/app/config'
import { Logo } from '@/components/brand/Logo'
import { PasswordInput } from '@/components/common/PasswordInput'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { Segmented } from '@/components/ui/Segmented'
import { ServiceError } from '@/services'
import { useAuthStore } from '@/stores/authStore'
import { notify } from '@/utils/notify'
import { BrandPanel } from './BrandPanel'
import { ForgotPasswordModal } from './ForgotPasswordModal'
import { loginSchema, registerSchema, type LoginValues, type RegisterValues } from './schemas'

type Mode = 'login' | 'register'

function LoginForm({ onForgot, presetEmail }: { onForgot: () => void; presetEmail: string }) {
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()
  const location = useLocation()
  const [formError, setFormError] = useState('')
  const { register, handleSubmit, setError, setValue, formState: { errors, isSubmitting } } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema), defaultValues: { email: presetEmail, password: '', remember: true },
  })

  async function submit(values: LoginValues): Promise<void> {
    setFormError('')
    try {
      const user = await login(values)
      notify.success(`Bienvenido, ${user.name.split(' ')[0]}`, 'Tu panel está actualizado.')
      const from = (location.state as { from?: string } | null)?.from
      navigate(from && from !== '/login' ? from : '/dashboard', { replace: true })
    } catch (e) {
      if (e instanceof ServiceError && (e.field === 'email' || e.field === 'password')) setError(e.field, { message: e.message })
      else setFormError(e instanceof ServiceError ? e.message : 'No pudimos iniciar sesión. Inténtalo de nuevo.')
    }
  }

  function fillDemo(): void {
    setValue('email', APP_CONFIG.demoCredentials.email, { shouldValidate: true })
    setValue('password', APP_CONFIG.demoCredentials.password, { shouldValidate: true })
    setFormError('')
  }

  return (
    <form onSubmit={(e) => void handleSubmit(submit)(e)} className="space-y-5" noValidate>
      <Field label="Correo electrónico" htmlFor="li-email" error={errors.email?.message}>
        <Input id="li-email" type="email" autoComplete="email" placeholder="tu@correo.com" leading={<Mail className="h-4 w-4" />} invalid={!!errors.email} {...register('email')} />
      </Field>
      <Field label="Contraseña" htmlFor="li-pass" error={errors.password?.message}>
        <PasswordInput id="li-pass" autoComplete="current-password" placeholder="Tu contraseña" invalid={!!errors.password} {...register('password')} />
      </Field>
      <div className="flex items-center justify-between">
        <label className="flex cursor-pointer items-center gap-2.5 text-[13.5px] text-ink-2">
          <input type="checkbox" className="h-4 w-4 rounded border-line-strong accent-[rgb(var(--brand))]" {...register('remember')} />
          Recordar sesión
        </label>
        <button type="button" onClick={onForgot} className="text-[13.5px] font-semibold text-brand-ink hover:underline">¿Olvidaste tu contraseña?</button>
      </div>
      {formError && <p role="alert" className="rounded-xl bg-expense-soft px-4 py-3 text-[13px] font-medium text-expense">{formError}</p>}
      <Button type="submit" variant="primary" size="lg" className="w-full" loading={isSubmitting}>
        Iniciar sesión <ArrowRight className="h-4 w-4" />
      </Button>

      <div className="rounded-2xl border border-dashed border-line-strong bg-surface-2/70 p-4">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-ink"><Sparkles className="h-[18px] w-[18px]" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold text-ink">Cuenta de demostración</p>
            <p className="num mt-0.5 break-all text-[12.5px] text-ink-2">{APP_CONFIG.demoCredentials.email}</p>
            <p className="num text-[12.5px] text-ink-2">{APP_CONFIG.demoCredentials.password}</p>
          </div>
          <Button size="sm" variant="soft" onClick={fillDemo}>Usar</Button>
        </div>
      </div>
    </form>
  )
}

function RegisterForm() {
  const registerUser = useAuthStore((s) => s.register)
  const navigate = useNavigate()
  const [formError, setFormError] = useState('')
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema), defaultValues: { name: '', email: '', password: '', confirm: '' },
  })

  async function submit(values: RegisterValues): Promise<void> {
    setFormError('')
    try {
      const user = await registerUser({ name: values.name, email: values.email, password: values.password })
      notify.success(`Cuenta creada, ${user.name.split(' ')[0]}`, 'Empezamos con categorías base para que registres tu primer movimiento.')
      navigate('/dashboard', { replace: true })
    } catch (e) {
      if (e instanceof ServiceError && (e.field === 'email' || e.field === 'password')) setError(e.field, { message: e.message })
      else setFormError(e instanceof ServiceError ? e.message : 'No pudimos crear la cuenta.')
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(submit)(e)} className="space-y-4" noValidate>
      <Field label="Nombre completo" htmlFor="rg-name" error={errors.name?.message}>
        <Input id="rg-name" autoComplete="name" placeholder="Tu nombre" leading={<User className="h-4 w-4" />} invalid={!!errors.name} {...register('name')} />
      </Field>
      <Field label="Correo electrónico" htmlFor="rg-email" error={errors.email?.message}>
        <Input id="rg-email" type="email" autoComplete="email" placeholder="tu@correo.com" leading={<Mail className="h-4 w-4" />} invalid={!!errors.email} {...register('email')} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Contraseña" htmlFor="rg-pass" error={errors.password?.message}>
          <PasswordInput id="rg-pass" autoComplete="new-password" invalid={!!errors.password} {...register('password')} />
        </Field>
        <Field label="Confirmar" htmlFor="rg-confirm" error={errors.confirm?.message}>
          <PasswordInput id="rg-confirm" autoComplete="new-password" invalid={!!errors.confirm} {...register('confirm')} />
        </Field>
      </div>
      <p className="text-[12px] text-ink-3">Mínimo 8 caracteres, con al menos una letra y un número, sin espacios.</p>
      {formError && <p role="alert" className="rounded-xl bg-expense-soft px-4 py-3 text-[13px] font-medium text-expense">{formError}</p>}
      <Button type="submit" variant="primary" size="lg" className="w-full" loading={isSubmitting}>Crear cuenta <ArrowRight className="h-4 w-4" /></Button>
    </form>
  )
}

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [forgotOpen, setForgotOpen] = useState(false)
  const [presetEmail, setPresetEmail] = useState('')
  const [formKey, setFormKey] = useState(0)

  return (
    <div className="grid min-h-dvh bg-canvas lg:grid-cols-[1.05fr_1fr]">
      <BrandPanel />
      <main className="relative flex flex-col justify-center px-5 py-10 pt-[max(2.5rem,env(safe-area-inset-top))] sm:px-10 lg:px-14 xl:px-24">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-brand/10 to-transparent lg:hidden" aria-hidden />
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }} className="relative mx-auto w-full max-w-[440px]">
          <Logo size={40} className="mb-8 lg:hidden" />
          <h1 className="text-[1.9rem] font-extrabold leading-tight text-ink">{mode === 'login' ? 'Bienvenido de vuelta' : 'Crea tu cuenta'}</h1>
          <p className="mb-7 mt-2 text-[14.5px] leading-relaxed text-ink-2">
            {mode === 'login' ? 'Ingresa para ver cómo van tus finanzas hoy.' : 'Empieza a ordenar tus finanzas en menos de un minuto.'}
          </p>
          <Segmented
            ariaLabel="Acceso" fullWidth className="mb-7" value={mode} onChange={setMode}
            options={[{ value: 'login', label: 'Iniciar sesión' }, { value: 'register', label: 'Crear cuenta' }]}
          />
          {mode === 'login' ? (
            <LoginForm key={formKey} presetEmail={presetEmail} onForgot={() => setForgotOpen(true)} />
          ) : (
            <RegisterForm />
          )}
        </motion.div>
      </main>
      <ForgotPasswordModal
        open={forgotOpen} onOpenChange={setForgotOpen}
        onDone={(email) => { setPresetEmail(email); setFormKey((k) => k + 1) }}
      />
    </div>
  )
}
