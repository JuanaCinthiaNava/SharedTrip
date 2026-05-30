// Docs tab — Phase 1 empty state.
// Phase 3 will replace this with the document vault (upload, view, offline cache).

import { FileText } from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'
import { es } from '@/i18n/es'

export default function DocsPage() {
  return (
    <EmptyState
      icon={FileText}
      heading={es.tabs.docsEmptyHeading}
      body={es.tabs.docsEmptyBody}
    />
  )
}
