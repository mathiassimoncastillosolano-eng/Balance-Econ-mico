import { z } from 'zod'

export const passwordRule = z
  .string()
  .min(8, 'Mínimo 8 caracteres.')
  .refine((v) => !/\s/.test(v), 'No debe contener espacios.')
  .refine((v) => /[A-Za-z]/.test(v), 'Incluye al menos una letra.')
  .refine((v) => /\d/.test(v), 'Incluye al menos un número.')

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Ingresa tu correo.').pipe(z.email('Ingresa un correo válido.')),
  password: z.string().min(1, 'Ingresa tu contraseña.'),
  remember: z.boolean(),
})

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Ingresa tu nombre.').max(60, 'Máximo 60 caracteres.'),
    email: z.string().trim().min(1, 'Ingresa tu correo.').pipe(z.email('Ingresa un correo válido.')),
    password: passwordRule,
    confirm: z.string().min(1, 'Confirma tu contraseña.'),
  })
  .refine((v) => v.password === v.confirm, { message: 'Las contraseñas no coinciden.', path: ['confirm'] })

export type LoginValues = z.infer<typeof loginSchema>
export type RegisterValues = z.infer<typeof registerSchema>
