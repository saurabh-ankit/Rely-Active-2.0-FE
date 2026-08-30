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
      <div className="rounded-xl bg-card text-card-foreground/70 px-2 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
        <div
          ref={scrollContainerRef}
          className="patient-tabs-scrollbar w-full overflow-x-auto overflow-y-hidden px-1 pb-1"
          style={{ scrollBehavior: 'auto' }}
        >
          <TabsList className="inline-flex w-max min-w-full gap-1 justify-start">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                ref={tab.value === activeTab ? activeTriggerRef : null}
                className="flex items-center gap-2 whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground focus-visible:!ring-0 focus-visible:!ring-offset-0"
              >
                {tab.icon && <tab.icon className="h-4 w-4 shrink-0" />}
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
