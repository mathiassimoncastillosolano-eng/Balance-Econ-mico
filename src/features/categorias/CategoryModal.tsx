import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { CategoryIcon } from '@/components/common/CategoryIcon'
import { ColorPicker } from '@/components/common/ColorPicker'
import { IconPicker } from '@/components/common/IconPicker'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { Segmented } from '@/components/ui/Segmented'
import { Switch } from '@/components/ui/Switch'
import { ServiceError } from '@/services'
import { useDataStore } from '@/stores/dataStore'
import type { Category, MovementType } from '@/types/domain'
import { notify } from '@/utils/notify'

const schema = z.object({
  name: z.string().trim().min(2, 'Mínimo 2 caracteres.').max(30, 'Máximo 30 caracteres.'),
  type: z.enum(['INGRESO', 'EGRESO']),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color inválido.'),
  icon: z.string().min(1),
  active: z.boolean(),
})
type Values = z.infer<typeof schema>
const FORM_ID = 'category-form'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  category: Category | null
  defaultType: MovementType
  /** Si la categoría ya tiene conceptos, el tipo queda bloqueado. */
  typeLocked: boolean
  onSaved: (category: Category) => void
}

function CategoryForm({ category, defaultType, typeLocked, onSaved, onClose, onBusy }: Omit<Props, 'open' | 'onOpenChange'> & { onClose: () => void; onBusy: (b: boolean) => void }) {
  const createCategory = useDataStore((s) => s.createCategory)
  const updateCategory = useDataStore((s) => s.updateCategory)
  const { control, register, handleSubmit, setError, watch, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: category?.name ?? '', type: category?.type ?? defaultType, color: category?.color ?? '#2F6BFF',
      icon: category?.icon ?? 'wallet', active: (category?.status ?? 'ACTIVO') === 'ACTIVO',
    },
  })
  const [name, color, icon] = watch(['name', 'color', 'icon'])

  const submit = handleSubmit(async (v) => {
    onBusy(true)
    try {
      const input = { name: v.name, type: v.type, color: v.color, icon: v.icon, status: v.active ? ('ACTIVO' as const) : ('INACTIVO' as const) }
      const saved = category ? await updateCategory(category.id, input) : await createCategory(input)
      notify.success(category ? 'Categoría actualizada' : 'Categoría creada', saved.name)
      onSaved(saved)
      onClose()
    } catch (e) {
      if (e instanceof ServiceError && (e.field === 'name' || e.field === 'type')) setError(e.field, { message: e.message })
      else notify.error(e)
    } finally {
      onBusy(false)
    }
  })

  return (
    <form id={FORM_ID} onSubmit={(e) => void submit(e)} className="space-y-5 pt-1" noValidate>
      <div className="flex items-center gap-3.5 rounded-2xl bg-surface-2 p-3.5">
        <CategoryIcon category={{ color, icon }} size="lg" />
        <div className="min-w-0"><p className="truncate font-display text-base font-bold text-ink">{name.trim() || 'Nueva categoría'}</p><p className="text-[12.5px] text-ink-2">Así se verá en toda la plataforma</p></div>
      </div>
      <Field label="Nombre" htmlFor="cat-name" error={errors.name?.message}>
        <Input id="cat-name" autoFocus placeholder="Ej. Mascotas" invalid={!!errors.name} {...register('name')} />
      </Field>
      <Field label="Tipo" error={errors.type?.message} hint={typeLocked ? 'No se puede cambiar: la categoría ya tiene conceptos.' : undefined}>
        <Controller control={control} name="type" render={({ field }) => (
          <div className={typeLocked ? 'pointer-events-none opacity-60' : undefined}>
            <Segmented ariaLabel="Tipo de categoría" fullWidth value={field.value} onChange={field.onChange}
              options={[{ value: 'EGRESO', label: 'Egresos', tone: 'expense' }, { value: 'INGRESO', label: 'Ingresos', tone: 'income' }]} />
          </div>
        )} />
      </Field>
      <Field label="Color"><Controller control={control} name="color" render={({ field }) => <ColorPicker value={field.value} onChange={field.onChange} />} /></Field>
      <Field label="Icono"><Controller control={control} name="icon" render={({ field }) => <IconPicker value={field.value} onChange={field.onChange} color={color} />} /></Field>
      <div className="flex items-center justify-between rounded-xl border border-line p-3.5">
        <div><p className="text-[13.5px] font-semibold text-ink">Categoría activa</p><p className="text-[12.5px] text-ink-2">Las inactivas no aparecen al registrar movimientos.</p></div>
        <Controller control={control} name="active" render={({ field }) => <Switch checked={field.value} onChange={field.onChange} label="Categoría activa" />} />
      </div>
    </form>
  )
}

export function CategoryModal({ open, onOpenChange, ...rest }: Props) {
  const [busy, setBusy] = useState(false)
  return (
    <Modal
      open={open} onOpenChange={(o) => { if (!busy) onOpenChange(o) }} size="md"
      title={rest.category ? 'Editar categoría' : 'Nueva categoría'}
      description="Las categorías clasifican tus ingresos y egresos."
      footer={<><Button variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>Cancelar</Button><Button type="submit" form={FORM_ID} variant="primary" loading={busy}>{rest.category ? 'Guardar cambios' : 'Crear categoría'}</Button></>}
    >
      <CategoryForm {...rest} onClose={() => onOpenChange(false)} onBusy={setBusy} />
    </Modal>
  )
}
