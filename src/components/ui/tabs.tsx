'use client'

import { Tabs as TabsPrimitive } from '@base-ui/react/tabs'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

function Tabs({ className, orientation = 'horizontal', ...props }: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn('group/tabs flex gap-2 data-horizontal:flex-col', className)}
      {...props}
    />
  )
}

/**
 * Simple line tabs: plain text tabs on a thin baseline, the active one in brand blue
 * with a 2px underline. The baseline is an inset shadow so the list can scroll sideways
 * without clipping the underline.
 */
const tabsListVariants = cva(
  'group/tabs-list flex w-full items-center gap-1 overflow-x-auto bg-transparent p-0 text-muted-foreground no-scrollbar group-data-horizontal/tabs:h-auto group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col group-data-vertical/tabs:items-stretch',
  {
    variants: {
      variant: {
        default:
          'group-data-horizontal/tabs:shadow-[inset_0_-1px_0_0_#e2e8f0] dark:group-data-horizontal/tabs:shadow-[inset_0_-1px_0_0_#334155]',
        line: 'group-data-horizontal/tabs:shadow-[inset_0_-1px_0_0_#e2e8f0] dark:group-data-horizontal/tabs:shadow-[inset_0_-1px_0_0_#334155]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function TabsList({
  className,
  variant = 'default',
  children,
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn('relative', tabsListVariants({ variant }), className)}
      {...props}
    >
      {children}
      {/*
       * One shared underline that slides to the active tab (Base UI sets the --active-tab-* vars, scroll included).
       * Positioned from the tab's own top + height, so it stays right even when the tabs wrap onto two rows.
       */}
      <TabsPrimitive.Indicator
        data-slot="tabs-indicator"
        className={cn(
          'pointer-events-none absolute left-(--active-tab-left) top-[calc(var(--active-tab-top)+var(--active-tab-height)-2px)] h-0.5 w-(--active-tab-width) rounded-full bg-[#005390] dark:bg-sky-400',
          'transition-[left,top,width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none',
          'group-data-vertical/tabs:hidden',
        )}
      />
    </TabsPrimitive.List>
  )
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        'relative inline-flex h-10 shrink-0 items-center justify-center gap-1.5 border-b-2 border-transparent bg-transparent px-3 text-sm font-medium whitespace-nowrap text-slate-500 transition-colors cursor-pointer',
        'hover:text-slate-800 focus-visible:outline-none focus-visible:text-slate-800 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50',
        // Horizontal tabs get their underline from the sliding indicator in TabsList; vertical ones keep a left border.
        'data-active:text-[#005390] group-data-vertical/tabs:data-active:border-[#005390]',
        'dark:text-slate-400 dark:hover:text-slate-100 dark:data-active:text-sky-300 dark:group-data-vertical/tabs:data-active:border-sky-400',
        'group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start group-data-vertical/tabs:border-b-0 group-data-vertical/tabs:border-l-2',
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      // Inactive panels unmount, so each switch replays this short fade + lift (no transform is left behind).
      className={cn(
        'flex-1 text-sm outline-none animate-in fade-in slide-in-from-bottom-1 duration-300 motion-reduce:animate-none',
        className,
      )}
      {...props}
    />
  )
}

/** Secondary text inside a tab (a time, a count): muted, and tinted brand blue while its tab is active. */
const TAB_HINT = 'text-[10px] font-medium text-gray-400 [[data-active]_&]:text-[#005390]/70'

/** Count chip inside a tab ("Mains 12"): grey, brand-tinted while its tab is active. */
const TAB_COUNT =
  'rounded-full bg-gray-100 px-1.5 text-[10px] font-bold tabular-nums text-gray-600 transition-colors [[data-active]_&]:bg-[#005390]/10 [[data-active]_&]:text-[#005390]'

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants, TAB_HINT, TAB_COUNT }
