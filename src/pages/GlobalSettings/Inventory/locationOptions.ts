import type { LocationOption } from './LocationTable'
export function inventoryLocationOptions(
  properties: { id: string; property_name: string; isActive: boolean }[],
  selected: string[] = [],
  allowed?: string[],
): LocationOption[] {
  const options = properties
    .filter((p) => !allowed || allowed.includes(p.id))
    .map((p) => ({ id: p.id, name: p.property_name, disabled: !p.isActive }))
  for (const id of selected)
    if (!options.some((p) => p.id === id)) options.push({ id, name: `Unavailable location (${id})`, disabled: true })
  return options
}
