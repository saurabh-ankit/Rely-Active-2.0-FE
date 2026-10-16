/**
 * Labels for where a unit sits. Entities that skip a level (villas, plots…) are stored with a
 * hidden floor (`is_virtual`), which must never show up as "Floor 1" or "Ground Floor".
 * A hidden block is named after its entity, so its name ("Villas") reads correctly as is.
 */

export interface FloorLike {
  floor_name?: string | null
  floor_number?: number | null
  floor_type?: string | null
  is_virtual?: boolean | null
}

export interface UnitLike {
  unit_number?: string | null
  floor?: (FloorLike & { block?: { block_name?: string | null; name?: string | null } | null }) | null
}

export const isHiddenFloor = (floor?: FloorLike | null) => Boolean(floor?.is_virtual) || floor?.floor_type === 'VIRTUAL'

/** "Floor 2" / the floor's own name, or null for hidden floors. */
export function floorLabel(floor?: FloorLike | null): string | null {
  if (!floor || isHiddenFloor(floor)) return null
  if (floor.floor_name) return floor.floor_name
  return floor.floor_number != null ? `Floor ${floor.floor_number}` : null
}

/** "Tower A · Floor 2 · A-21", or "Villas · V-01" for entities without floors. */
export function unitLocationLabel(unit?: UnitLike | null): string {
  if (!unit) return ''
  const block = unit.floor?.block?.block_name || unit.floor?.block?.name || null
  return [block, floorLabel(unit.floor), unit.unit_number].filter(Boolean).join(' · ')
}
