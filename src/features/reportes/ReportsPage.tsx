import { useState } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
import { Segmented } from '@/components/ui/Segmented'
import { AnnualReport } from './AnnualReport'
import { MonthlyReport } from './MonthlyReport'

export default function ReportsPage() {
  const [tab, setTab] = useState<'month' | 'year'>('month')
  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        eyebrow="Análisis" title="Reportes y estadísticas" description="Analiza tu comportamiento financiero por mes o por año, compara periodos y exporta la información."
        actions={<Segmented ariaLabel="Tipo de reporte" value={tab} onChange={setTab} options={[{ value: 'month', label: 'Mensual' }, { value: 'year', label: 'Anual' }]} />}
      />
      {tab === 'month' ? <MonthlyReport /> : <AnnualReport />}
    </div>
  )
}
