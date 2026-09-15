import type { ComponentProps } from 'react'
import { ResponsiveTabs } from '@/components/common/ResponsiveTabs'

export function InventoryTabs(props: Omit<ComponentProps<typeof ResponsiveTabs>, 'className'>) {
  return (
    <ResponsiveTabs
      {...props}
      className="w-full min-w-0 gap-6 [&_[role=tab][data-active]]:bg-primary [&_[role=tab][data-active]]:text-primary-foreground [&_[role=tab]:focus-visible]:outline-2 [&_[role=tab]:focus-visible]:outline-offset-2 [&_[role=tab]:focus-visible]:outline-ring"
    />
  )
}
