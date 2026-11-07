import { Compass } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/common/EmptyState'
import { Button } from '@/components/ui/Button'

export default function NotFoundPage() {
  return (
    <EmptyState
      icon={Compass} title="Esta página no existe" description="Puede que el enlace haya cambiado o que la dirección esté mal escrita."
      action={<Link to="/dashboard"><Button variant="primary">Volver al resumen</Button></Link>}
    />
  )
}
