'use client'
import * as React from 'react'
import { Select as SelectPrimitive } from '@base-ui/react/select'
import { cn } from '@/lib/utils'
import { ChevronDownIcon, CheckIcon, ChevronUpIcon } from 'lucide-react'
const SelectContext = React.createContext<{
  valueLabelMap: Map<unknown, string>
  selectedValue?: unknown
}>({ valueLabelMap: new Map() })
function extractText(node: React.ReactNode): string | undefined {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node)
  }
  if (Array.isArray(node)) {
    const text = node.map(extractText).filter(Boolean).join(' ')
    return text || undefined
  }
  if (React.isValidElement(node) && (node.props as { children?: React.ReactNode })?.children) {
    return extractText((node.props as { children?: React.ReactNode }).children)
  }
  return undefined
}
function buildValueLabelMap(node: React.ReactNode, map: Map<unknown, string> = new Map()): Map<unknown, string> {
  React.Children.forEach(node, (child) => {
    if (!React.isValidElement(child)) return
    const props = child.props as Record<string, unknown>
    if (props) {
      if (props.value !== undefined) {
        const label = (props.label as string | undefined) ?? extractText(props.children as React.ReactNode)
        if (label) {
          map.set(props.value, label)
        }
      }
      if (props.children) {
        buildValueLabelMap(props.children as React.ReactNode, map)
      }
    }
  })
  return map
}
function Select<Value = string, Multiple extends boolean | undefined = false>({
  children,
  value,
  defaultValue,
  ...props
}: SelectPrimitive.Root.Props<Value, Multiple>) {
  const valueLabelMap = React.useMemo(() => {
    return buildValueLabelMap(children)
  }, [children])
  return (
    <SelectContext.Provider value={{ valueLabelMap, selectedValue: value ?? defaultValue }}>
      <SelectPrimitive.Root value={value} defaultValue={defaultValue} {...props}>
        {children}
      </SelectPrimitive.Root>
    </SelectContext.Provider>
  )
}
function SelectGroup({ className, ...props }: SelectPrimitive.Group.Props) {
  return <SelectPrimitive.Group data-slot="select-group" className={cn('p-1', className)} {...props} />
}
function SelectValue({ className, placeholder, children, ...props }: SelectPrimitive.Value.Props) {
  const { valueLabelMap, selectedValue } = React.useContext(SelectContext)
  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      className={cn('flex flex-1 text-left truncate', className)}
      placeholder={placeholder}
      {...props}
    >
      {(value: unknown) => {
        if (typeof children === 'function') {
          return (children as (val: unknown) => React.ReactNode)(value)
        }
        if (children != null) {
          return children
        }
        const currentVal = value ?? selectedValue
        if (currentVal !== undefined && currentVal !== null && currentVal !== '') {
          const mapLabel = valueLabelMap.get(currentVal)
          if (mapLabel) {
            return mapLabel
          }
        }
        return placeholder
      }}
    </SelectPrimitive.Value>
  )
}
function SelectTrigger({
  className,
  size = 'default',
  children,
  ...props
}: SelectPrimitive.Trigger.Props & {
  size?: 'sm' | 'default'
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        'group flex w-full items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-2xs transition-all outline-none select-none hover:bg-gray-50 focus:border-[#005390] focus:ring-2 focus:ring-[#005390]/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700/50 data-[size=default]:h-9 data-[size=sm]:h-7 data-[size=sm]:px-2.5 data-[size=sm]:text-[11px] *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-1.5',
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon
        render={
          <ChevronDownIcon className="pointer-events-none size-3.5 shrink-0 text-gray-400 group-hover:text-gray-600 transition-transform duration-200 group-aria-expanded:rotate-180 group-data-[popup-open]:rotate-180 data-[popup-open]:rotate-180 dark:text-gray-500" />
        }
      />
    </SelectPrimitive.Trigger>
  )
}
function SelectContent({
  className,
  children,
  side = 'bottom',
  sideOffset = 6,
  align = 'start',
  alignOffset = 0,
  alignItemWithTrigger = false,
  ...props
}: SelectPrimitive.Popup.Props &
  Pick<SelectPrimitive.Positioner.Props, 'align' | 'alignOffset' | 'side' | 'sideOffset' | 'alignItemWithTrigger'>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        alignItemWithTrigger={alignItemWithTrigger}
        className="isolate z-50 outline-none"
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          data-align-trigger={alignItemWithTrigger}
          className={cn(
            'relative isolate z-50 max-h-72 min-w-[max(12rem,var(--anchor-width,12rem))] max-w-sm origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-2xl border border-gray-100 bg-white p-1.5 text-gray-800 shadow-xl ring-1 ring-black/5 duration-150 outline-none scrollbar-thin dark:border-gray-800 dark:bg-slate-900 dark:text-gray-100 dark:ring-white/10 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
            className,
          )}
          {...props}
        >
          <SelectScrollUpButton />
          <SelectPrimitive.List className="p-0.5 space-y-0.5 outline-none">{children}</SelectPrimitive.List>
          <SelectScrollDownButton />
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  )
}
function SelectLabel({ className, ...props }: SelectPrimitive.GroupLabel.Props) {
  return (
    <SelectPrimitive.GroupLabel
      data-slot="select-label"
      className={cn(
        'px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500',
        className,
      )}
      {...props}
    />
  )
}
function SelectItem({ className, children, label, ...props }: SelectPrimitive.Item.Props) {
  const itemLabel = label ?? extractText(children)
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      label={itemLabel}
      className={cn(
        'relative flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 transition-colors outline-none select-none hover:bg-gray-100/80 hover:text-gray-900 data-[highlighted]:bg-[#005390]/10 data-[highlighted]:text-[#005390] data-[selected]:bg-[#005390]/10 data-[selected]:text-[#005390] data-[selected]:font-bold data-disabled:pointer-events-none data-disabled:opacity-40 dark:text-gray-300 dark:hover:bg-slate-800/80 dark:hover:text-white dark:data-[highlighted]:bg-[#005390]/20 dark:data-[highlighted]:text-blue-400 dark:data-[selected]:bg-[#005390]/20 dark:data-[selected]:text-blue-400',
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText className="flex-1 truncate text-left">{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="ml-2 flex size-4 shrink-0 items-center justify-center text-[#005390] dark:text-blue-400">
        <CheckIcon className="size-3.5 stroke-[2.5]" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
}
function SelectSeparator({ className, ...props }: SelectPrimitive.Separator.Props) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn('pointer-events-none -mx-1 my-1 h-px bg-gray-100 dark:bg-gray-800', className)}
      {...props}
    />
  )
}
function SelectScrollUpButton({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.ScrollUpArrow>) {
  return (
    <SelectPrimitive.ScrollUpArrow
      data-slot="select-scroll-up-button"
      className={cn(
        'flex w-full cursor-default items-center justify-center py-1 text-gray-400 hover:text-gray-600 bg-gradient-to-b from-white to-transparent dark:from-slate-900',
        className,
      )}
      {...props}
    >
      <ChevronUpIcon className="size-3.5" />
    </SelectPrimitive.ScrollUpArrow>
  )
}
function SelectScrollDownButton({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.ScrollDownArrow>) {
  return (
    <SelectPrimitive.ScrollDownArrow
      data-slot="select-scroll-down-button"
      className={cn(
        'flex w-full cursor-default items-center justify-center py-1 text-gray-400 hover:text-gray-600 bg-gradient-to-t from-white to-transparent dark:from-slate-900',
        className,
      )}
      {...props}
    >
      <ChevronDownIcon className="size-3.5" />
    </SelectPrimitive.ScrollDownArrow>
  )
}
export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
