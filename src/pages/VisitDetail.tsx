import { useParams } from 'react-router-dom'
import { VisitDetailView } from '@/components/features/VisitDetailView'

export default function VisitDetail() {
  const { visitId } = useParams()
  return <VisitDetailView visitId={visitId} />
}
