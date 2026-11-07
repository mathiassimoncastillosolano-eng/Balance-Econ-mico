import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { AmountInput } from '@/components/common/AmountInput'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { Segmented } from '@/components/ui/Segmented'
import { ServiceError } from '@/services'
import { useDataStore } from '@/stores/dataStore'
import { useUiStore } from '@/stores/uiStore'
import type { MovementType } from '@/types/domain'
import { todayISO } from '@/utils/dates'
import { notify } from '@/utils/notify'
import { ConceptPicker } from './ConceptPicker'

const schema = z.object({
  type: z.enum(['INGRESO', 'EGRESO']),
  amount: z.string().min(1, 'Ingresa un importe.').refine((v) => Number(v) > 0, 'El importe debe ser mayor a 0.'),
  conceptId: z.string().min(1, 'Selecciona o crea un concepto.'),
  date: z.string().min(1, 'Selecciona una fecha.').refine((v) => v <= todayISO(), 'La fecha no puede ser futura.'),
  note: z.string().max(140, 'Máximo 140 caracteres.'),
})
type FormValues = z.infer<typeof schema>

const FORM_ID = 'movement-form'

function MovementForm({ onBusy }: { onBusy: (busy: boolean) => void }) {
  const modal = useUiStore((s) => s.movementModal)
  const close = useUiStore((s) => s.closeMovementModal)
  const create = useDataStore((s) => s.createTransaction)
  const update = useDataStore((s) => s.updateTransaction)
  const editing = modal.mode === 'edit' ? modal.transaction : null

  const concepts = useDataStore((s) => s.data.concepts)
  const categories = useDataStore((s) => s.data.categories)
  const presetConcept = modal.presetConceptId ? concepts.find((c) => c.id === modal.presetConceptId) : undefined
  const presetCategory = presetConcept ? categories.find((c) => c.id === presetConcept.categoryId) : undefined

  const { control, register, handleSubmit, setValue, setError, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: presetCategory?.type ?? modal.presetType,
      amount: editing ? String(editing.amount) : presetConcept && presetConcept.baseAmount > 0 ? String(presetConcept.baseAmount) : '',
      conceptId: editing?.conceptId ?? presetConcept?.id ?? '',
      date: editing?.date ?? todayISO(),
      note: editing?.note ?? '',
    },
  })
  const type = watch('type')
  const amount = watch('amount')

  const submit = handleSubmit(async (values) => {
    onBusy(true)
    try {
      const input = { conceptId: values.conceptId, amount: Math.round(Number(values.amount) * 100) / 100, date: values.date, note: values.note }
      if (editing) {
        await update(editing.id, input)
        notify.success('Movimiento actualizado', 'Los indicadores se recalcularon.')
      } else {
        await create(input)
        notify.success(values.type === 'INGRESO' ? 'Ingreso registrado' : 'Egreso registrado', 'Ya aparece en tu historial y en el resumen.')
      }
      close()
    } catch (e) {
      if (e instanceof ServiceError && e.field && e.field in schema.shape) setError(e.field as keyof FormValues, { message: e.message })
      else notify.error(e)
    } finally {
      onBusy(false)
    }
  })

  function changeType(next: MovementType): void {
    if (next === type) return
    setValue('type', next)
    setValue('conceptId', '')
  }

  return (
    <form id={FORM_ID} onSubmit={(e) => void submit(e)} className="space-y-5 pt-1" noValidate>
      <Segmented
        ariaLabel="Tipo de movimiento" fullWidth value={type} onChange={changeType}
        options={[
          { value: 'EGRESO', label: 'Egreso', tone: 'expense', icon: <ArrowUpRight className="h-4 w-4" /> },
          { value: 'INGRESO', label: 'Ingreso', tone: 'income', icon: <ArrowDownLeft className="h-4 w-4" /> },
        ]}
      />

      <Field label="Importe" htmlFor="mv-amount" error={errors.amount?.message}>
        <Controller control={control} name="amount" render={({ field }) => (
          <AmountInput id="mv-amount" large autoFocus value={field.value} onValueChange={field.onChange} onBlur={field.onBlur} ref={field.ref} invalid={!!errors.amount} />
        )} />
      </Field>

      <Field label="Concepto" error={errors.conceptId?.message}>
        <Controller control={control} name="conceptId" render={({ field }) => (
          <ConceptPicker
            type={type} value={field.value} amount={Number(amount) || 0} invalid={!!errors.conceptId}
            onSelect={(concept) => {
              field.onChange(concept.id)
              if (!amount && concept.baseAmount > 0) setValue('amount', String(concept.baseAmount), { shouldValidate: true })
            }}
            onClear={() => field.onChange('')}
          />
        )} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
        <Field label="Fecha" htmlFor="mv-date" error={errors.date?.message}>
          <Input id="mv-date" type="date" max={todayISO()} invalid={!!errors.date} {...register('date')} />
        </Field>
        <Field label="Nota" htmlFor="mv-note" optional error={errors.note?.message}>
          <Textarea id="mv-note" rows={1} placeholder="Ej. Pago de marzo" invalid={!!errors.note} {...register('note')} />
        </Field>
      </div>
    </form>
  )
}

/** Modal global de registro/edición. Se abre desde el encabezado, atajo «N» o cualquier lista. */
export function MovementFormModal() {
  const modal = useUiStore((s) => s.movementModal)
  const close = useUiStore((s) => s.closeMovementModal)
  const [busy, setBusy] = useState(false)
  const editing = modal.mode === 'edit'

  return (
    <Modal
      open={modal.open} onOpenChange={(o) => { if (!o && !busy) close() }} size="md"
      title={editing ? 'Editar movimiento' : 'Nuevo movimiento'}
      description={editing ? 'Los cambios actualizan de inmediato tus indicadores.' : 'Importe, concepto y listo. Lo demás es opcional.'}
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={busy}>Cancelar</Button>
          <Button type="submit" form={FORM_ID} variant="primary" loading={busy}>{editing ? 'Guardar cambios' : 'Registrar movimiento'}</Button>
        </>
      }
    >
      <MovementForm onBusy={setBusy} />
    </Modal>
  )
}
