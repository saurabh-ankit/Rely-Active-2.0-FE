import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'

const tones = {
  green: 'border-green-200 bg-green-100 text-green-800',
  amber: 'border-amber-200 bg-amber-100 text-amber-800',
  blue: 'border-blue-200 bg-blue-100 text-blue-800',
  red: 'border-red-200 bg-red-100 text-red-800',
  neutral: 'border-gray-200 bg-gray-100 text-gray-700',
}

export function InventoryStatus({ tone, children }: { tone: keyof typeof tones; children: ReactNode }) {
  return (
    <Badge variant="outline" className={tones[tone]}>
      {children}
    </Badge>
  )
}

export function ActiveStatus({ active }: { active: boolean }) {
  return <InventoryStatus tone={active ? 'green' : 'neutral'}>{active ? 'Active' : 'Inactive'}</InventoryStatus>
}
