import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { AmountInput } from '@/components/common/AmountInput'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { Switch } from '@/components/ui/Switch'
import { ServiceError } from '@/services'
import { useDataStore } from '@/stores/dataStore'
import type { Concept, MovementType } from '@/types/domain'
import { notify } from '@/utils/notify'

const schema = z.object({
  name: z.string().trim().min(2, 'Mínimo 2 caracteres.').max(40, 'Máximo 40 caracteres.'),
  categoryId: z.string().min(1, 'Selecciona una categoría.'),
  baseAmount: z.string().refine((v) => v === '' || Number(v) >= 0, 'Importe inválido.'),
  active: z.boolean(),
})
type Values = z.infer<typeof schema>
const FORM_ID = 'concept-form'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  concept: Concept | null
  categoryId: string
  type: MovementType
}

function ConceptForm({ concept, categoryId, type, onClose, onBusy }: Omit<Props, 'open' | 'onOpenChange'> & { onClose: () => void; onBusy: (b: boolean) => void }) {
  const categories = useDataStore((s) => s.data.categories)
  const createConcept = useDataStore((s) => s.createConcept)
  const updateConcept = useDataStore((s) => s.updateConcept)
  const options = useMemo(() => categories.filter((c) => !c.deletedAt && c.type === type && (c.status === 'ACTIVO' || c.id === categoryId)), [categories, type, categoryId])

  const { control, register, handleSubmit, setError, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: concept?.name ?? '', categoryId: concept?.categoryId ?? categoryId, baseAmount: concept && concept.baseAmount > 0 ? String(concept.baseAmount) : '', active: (concept?.status ?? 'ACTIVO') === 'ACTIVO' },
  })

  const submit = handleSubmit(async (v) => {
    onBusy(true)
    try {
      const input = { name: v.name, categoryId: v.categoryId, baseAmount: Number(v.baseAmount || 0), status: v.active ? ('ACTIVO' as const) : ('INACTIVO' as const) }
      const saved = concept ? await updateConcept(concept.id, input) : await createConcept(input)
      notify.success(concept ? 'Concepto actualizado' : 'Concepto creado', saved.name)
      onClose()
    } catch (e) {
      if (e instanceof ServiceError && (e.field === 'name' || e.field === 'categoryId' || e.field === 'baseAmount')) setError(e.field, { message: e.message })
      else notify.error(e)
    } finally {
      onBusy(false)
    }
  })

  return (
    <form id={FORM_ID} onSubmit={(e) => void submit(e)} className="space-y-5 pt-1" noValidate>
      <Field label="Nombre del concepto" htmlFor="con-name" error={errors.name?.message}>
        <Input id="con-name" autoFocus placeholder={type === 'INGRESO' ? 'Ej. Bono trimestral' : 'Ej. Alquiler'} invalid={!!errors.name} {...register('name')} />
      </Field>
      <Field label="Categoría" htmlFor="con-cat" error={errors.categoryId?.message}>
        <Select id="con-cat" invalid={!!errors.categoryId} {...register('categoryId')}>
          {options.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </Field>
      <Field label="Importe habitual" htmlFor="con-amount" optional hint="Se sugiere automáticamente al registrar un movimiento." error={errors.baseAmount?.message}>
        <Controller control={control} name="baseAmount" render={({ field }) => <AmountInput id="con-amount" value={field.value} onValueChange={field.onChange} />} />
      </Field>
      <div className="flex items-center justify-between rounded-xl border border-line p-3.5">
        <div><p className="text-[13.5px] font-semibold text-ink">Concepto activo</p><p className="text-[12.5px] text-ink-2">Los inactivos no se ofrecen al registrar.</p></div>
        <Controller control={control} name="active" render={({ field }) => <Switch checked={field.value} onChange={field.onChange} label="Concepto activo" />} />
      </div>
    </form>
  )
}

export function ConceptModal({ open, onOpenChange, ...rest }: Props) {
  const [busy, setBusy] = useState(false)
  return (
    <Modal
      open={open} onOpenChange={(o) => { if (!busy) onOpenChange(o) }} size="sm"
      title={rest.concept ? 'Editar concepto' : 'Nuevo concepto'}
      description="Un concepto es un elemento específico dentro de una categoría."
      footer={<><Button variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>Cancelar</Button><Button type="submit" form={FORM_ID} variant="primary" loading={busy}>{rest.concept ? 'Guardar cambios' : 'Crear concepto'}</Button></>}
    >
      <ConceptForm {...rest} onClose={() => onOpenChange(false)} onBusy={setBusy} />
    </Modal>
  )
}
