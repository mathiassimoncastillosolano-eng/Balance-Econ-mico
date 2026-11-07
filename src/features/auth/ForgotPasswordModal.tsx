import { zodResolver } from '@hookform/resolvers/zod'
import { KeyRound, Mail, ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { PasswordInput } from '@/components/common/PasswordInput'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { services, ServiceError } from '@/services'
import { notify } from '@/utils/notify'
import { passwordRule } from './schemas'

const emailSchema = z.object({ email: z.string().trim().min(1, 'Ingresa tu correo.').pipe(z.email('Ingresa un correo válido.')) })
const resetSchema = z.object({ code: z.string().trim().regex(/^\d{6}$/, 'El código tiene 6 dígitos.'), password: passwordRule })

interface Props { open: boolean; onOpenChange: (open: boolean) => void; defaultEmail?: string; onDone: (email: string) => void }

/** Recuperación de contraseña simulada en dos pasos. El código se muestra en pantalla porque no hay envío de correos. */
export function ForgotPasswordModal({ open, onOpenChange, defaultEmail = '', onDone }: Props) {
  const [step, setStep] = useState<'email' | 'reset'>('email')
  const [email, setEmail] = useState('')
  const [demoCode, setDemoCode] = useState('')

  const emailForm = useForm({ resolver: zodResolver(emailSchema), defaultValues: { email: defaultEmail } })
  const resetForm = useForm({ resolver: zodResolver(resetSchema), defaultValues: { code: '', password: '' } })

  function close(next: boolean): void {
    onOpenChange(next)
    if (!next) setTimeout(() => { setStep('email'); emailForm.reset({ email: defaultEmail }); resetForm.reset() }, 200)
  }

  const requestCode = emailForm.handleSubmit(async (values) => {
    try {
      const { code } = await services.auth.requestPasswordReset(values.email)
      setEmail(values.email)
      setDemoCode(code)
      setStep('reset')
    } catch (e) {
      if (e instanceof ServiceError) emailForm.setError('email', { message: e.message })
      else notify.error(e)
    }
  })

  const resetPassword = resetForm.handleSubmit(async (values) => {
    try {
      await services.auth.resetPassword({ email, code: values.code, password: values.password })
      notify.success('Contraseña actualizada', 'Ya puedes iniciar sesión con la nueva contraseña.')
      close(false)
      onDone(email)
    } catch (e) {
      if (e instanceof ServiceError) resetForm.setError(e.field === 'password' ? 'password' : 'code', { message: e.message })
      else notify.error(e)
    }
  })

  return (
    <Modal
      open={open} onOpenChange={close} size="sm"
      title={step === 'email' ? 'Recupera tu acceso' : 'Crea una nueva contraseña'}
      description={step === 'email' ? 'Te enviaremos un código de verificación a tu correo.' : `Ingresa el código enviado a ${email}.`}
      icon={<span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-ink">{step === 'email' ? <Mail className="h-5 w-5" /> : <KeyRound className="h-5 w-5" />}</span>}
    >
      {step === 'email' ? (
        <form onSubmit={(e) => void requestCode(e)} className="space-y-4 pt-2" noValidate>
          <Field label="Correo electrónico" htmlFor="fp-email" error={emailForm.formState.errors.email?.message}>
            <Input id="fp-email" type="email" autoComplete="email" autoFocus invalid={!!emailForm.formState.errors.email} {...emailForm.register('email')} />
          </Field>
          <Button type="submit" variant="primary" className="w-full" loading={emailForm.formState.isSubmitting}>Enviar código</Button>
        </form>
      ) : (
        <form onSubmit={(e) => void resetPassword(e)} className="space-y-4 pt-2" noValidate>
          <div className="flex gap-3 rounded-xl bg-warn-soft p-3.5">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-warn" />
            <p className="text-[12.5px] leading-snug text-ink-2">
              <strong className="text-ink">Simulación:</strong> como no hay servidor de correo, tu código es <span className="num rounded bg-surface px-1.5 py-0.5 font-bold text-ink">{demoCode}</span>.
            </p>
          </div>
          <Field label="Código de verificación" htmlFor="fp-code" error={resetForm.formState.errors.code?.message}>
            <Input id="fp-code" inputMode="numeric" maxLength={6} autoComplete="one-time-code" invalid={!!resetForm.formState.errors.code} {...resetForm.register('code')} />
          </Field>
          <Field label="Nueva contraseña" htmlFor="fp-pass" error={resetForm.formState.errors.password?.message} hint="Mínimo 8 caracteres, con letra y número.">
            <PasswordInput id="fp-pass" autoComplete="new-password" invalid={!!resetForm.formState.errors.password} {...resetForm.register('password')} />
          </Field>
          <Button type="submit" variant="primary" className="w-full" loading={resetForm.formState.isSubmitting}>Actualizar contraseña</Button>
        </form>
      )}
    </Modal>
  )
}
