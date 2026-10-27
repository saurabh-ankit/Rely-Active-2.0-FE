import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useIsMobile } from '@/hooks/use-mobile'

export interface TabItem {
  value: string
  label: string
  shortLabel: string
  icon?: LucideIcon
  content: React.ReactNode
}

interface ResponsiveTabsProps {
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  tabs: TabItem[]
  className?: string
}

export const ResponsiveTabs = ({ defaultValue, value, onValueChange, tabs, className }: ResponsiveTabsProps) => {
  const isMobile = useIsMobile()
  const [internalActiveTab, setInternalActiveTab] = useState(defaultValue || tabs[0]?.value || '')
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const activeTriggerRef = useRef<HTMLButtonElement | null>(null)

  const activeTab = value !== undefined ? value : internalActiveTab
  const setActiveTab = onValueChange || setInternalActiveTab
  const activeTabData = tabs.find((tab) => tab.value === activeTab) || tabs[0]

  const scrollActiveTriggerIntoView = useCallback(() => {
    if (isMobile) return
    const trigger = activeTriggerRef.current
    const container = scrollContainerRef.current
    if (!trigger || !container) return

    const triggerRect = trigger.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()

    if (triggerRect.left < containerRect.left) {
      container.scrollLeft -= containerRect.left - triggerRect.left + 8
    } else if (triggerRect.right > containerRect.right) {
      container.scrollLeft += triggerRect.right - containerRect.right + 8
    }
  }, [isMobile])

  const handleTabChange = (nextValue: string) => {
    setActiveTab(nextValue)
  }

  useLayoutEffect(() => {
    scrollActiveTriggerIntoView()
  }, [activeTab, isMobile, scrollActiveTriggerIntoView])

  useEffect(() => {
    if (isMobile) return
    const container = scrollContainerRef.current
    if (!container) return

    const trigger = container.querySelector(`[data-state="active"]`) as HTMLButtonElement | null
    if (trigger) {
      activeTriggerRef.current = trigger
    }
  }, [activeTab, isMobile])

  if (isMobile) {
    return (
      <div className={className}>
        <div className="mb-6">
          <Select value={activeTab} onValueChange={handleTabChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select tab">
                {activeTabData && (
                  <div className="flex items-center gap-2">
                    {activeTabData.icon && <activeTabData.icon className="h-4 w-4" />}
                    <span>{activeTabData.label}</span>
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {tabs.map((tab) => (
                <SelectItem key={tab.value} value={tab.value}>
                  <div className="flex items-center gap-2">
                    {tab.icon && <tab.icon className="h-4 w-4" />}
                    <span>{tab.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-6">{activeTabData?.content}</div>
      </div>
    )
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className={className}>
      <div className="rounded-full bg-slate-200/70 dark:bg-slate-800/80 border border-slate-300/70 dark:border-slate-700/80 p-1 shadow-2xs">
        <div
          ref={scrollContainerRef}
          className="patient-tabs-scrollbar w-full overflow-x-auto overflow-y-hidden"
          style={{ scrollBehavior: 'auto' }}
        >
          <TabsList className="flex w-full min-w-full h-auto gap-1 items-center justify-between bg-transparent p-0">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                ref={tab.value === activeTab ? activeTriggerRef : null}
                className="flex-1 flex h-8 items-center justify-center gap-2 whitespace-nowrap rounded-full px-3 sm:px-4 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-black/5 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/10 [&[data-active]]:!bg-[#005390] [&[data-active]]:!text-white [&[data-active]:hover]:!bg-[#005390] [&[data-active]:hover]:!text-white data-active:shadow-xs focus-visible:!ring-0 focus-visible:!ring-offset-0 transition-all cursor-pointer"
              >
                {tab.icon && <tab.icon className="size-4 shrink-0" />}
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.shortLabel}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </div>

      {tabs.map((tab) => (
        <TabsContent key={tab.value} value={tab.value} className="space-y-6">
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  )
}
