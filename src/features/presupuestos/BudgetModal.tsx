import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { AmountInput } from '@/components/common/AmountInput'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { CategorySelect } from '@/components/common/CategorySelect'
import { Modal } from '@/components/ui/Modal'
import { useMoney } from '@/hooks/useMoney'
import { ServiceError } from '@/services'
import { useDataStore } from '@/stores/dataStore'
import type { Budget, Category } from '@/types/domain'
import { notify } from '@/utils/notify'

const schema = z.object({
  categoryId: z.string().min(1, 'Selecciona una categoría.'),
  limit: z.string().min(1, 'Ingresa un límite.').refine((v) => Number(v) > 0, 'El límite debe ser mayor a 0.'),
})
type Values = z.infer<typeof schema>
const FORM_ID = 'budget-form'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  budget: Budget | null
  /** Categorías de egreso disponibles (sin presupuesto) o la propia al editar. */
  categories: Category[]
  presetCategoryId?: string
  presetLimit?: number
  /** Promedio mensual de los últimos 3 meses por categoría, para sugerir límites. */
  averages: Map<string, number>
}

function BudgetForm({ budget, categories, presetCategoryId, presetLimit, averages, onClose, onBusy }: Omit<Props, 'open' | 'onOpenChange'> & { onClose: () => void; onBusy: (b: boolean) => void }) {
  const money = useMoney()
  const createBudget = useDataStore((s) => s.createBudget)
  const updateBudget = useDataStore((s) => s.updateBudget)
  const { control, handleSubmit, setError, setValue, watch, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { categoryId: budget?.categoryId ?? presetCategoryId ?? categories[0]?.id ?? '', limit: budget ? String(budget.limit) : presetLimit ? String(presetLimit) : '' },
  })
  const categoryId = watch('categoryId')
  const avg = averages.get(categoryId) ?? 0

  const submit = handleSubmit(async (v) => {
    onBusy(true)
    try {
      const limit = Math.round(Number(v.limit) * 100) / 100
      if (budget) await updateBudget(budget.id, limit)
      else await createBudget({ categoryId: v.categoryId, limit })
      notify.success(budget ? 'Presupuesto actualizado' : 'Presupuesto creado')
      onClose()
    } catch (e) {
      if (e instanceof ServiceError && (e.field === 'limit' || e.field === 'categoryId')) setError(e.field, { message: e.message })
      else notify.error(e)
    } finally {
      onBusy(false)
    }
  })

  return (
    <form id={FORM_ID} onSubmit={(e) => void submit(e)} className="space-y-5 pt-1" noValidate>
      <Field label="Categoría" htmlFor="bd-cat" error={errors.categoryId?.message}>
        <Controller control={control} name="categoryId" render={({ field }) => (
          <CategorySelect id="bd-cat" categories={categories} value={field.value} onChange={field.onChange} disabled={!!budget} invalid={!!errors.categoryId} />
        )} />
      </Field>
      <Field label="Límite mensual" htmlFor="bd-limit" error={errors.limit?.message}>
        <Controller control={control} name="limit" render={({ field }) => <AmountInput id="bd-limit" large autoFocus value={field.value} onValueChange={field.onChange} invalid={!!errors.limit} />} />
      </Field>
      {avg > 0 && (
        <button type="button" onClick={() => setValue('limit', String(Math.ceil(avg / 10) * 10), { shouldValidate: true })} className="flex w-full items-center justify-between rounded-xl bg-brand-soft/60 px-4 py-3 text-left text-[13px] transition-colors hover:bg-brand-soft">
          <span className="text-ink-2">Promedio de los últimos 3 meses: <strong className="num text-ink">{money(avg, { compact: false })}</strong></span>
          <span className="font-semibold text-brand-ink">Usar</span>
        </button>
      )}
    </form>
  )
}

export function BudgetModal({ open, onOpenChange, ...rest }: Props) {
  const [busy, setBusy] = useState(false)
  return (
    <Modal
      open={open} onOpenChange={(o) => { if (!busy) onOpenChange(o) }} size="sm"
      title={rest.budget ? 'Editar presupuesto' : 'Nuevo presupuesto'}
      description="Define cuánto quieres gastar como máximo cada mes en esta categoría."
      footer={<><Button variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>Cancelar</Button><Button type="submit" form={FORM_ID} variant="primary" loading={busy}>{rest.budget ? 'Guardar' : 'Crear presupuesto'}</Button></>}
    >
      <BudgetForm {...rest} onClose={() => onOpenChange(false)} onBusy={setBusy} />
    </Modal>
  )
}
