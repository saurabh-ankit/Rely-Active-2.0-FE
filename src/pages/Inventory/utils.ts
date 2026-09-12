import { isAxiosError } from 'axios'
import type { PackageSnapshot } from '@/lib/types/centerInventory'
export const money = (amount: number | string) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(amount))
export const today = () => new Date().toLocaleDateString('en-CA')
export const errorMessage = (error: unknown) =>
  isAxiosError(error)
    ? (error.response?.data?.message ?? error.message)
    : error instanceof Error
      ? error.message
      : 'Unable to complete inventory request'
export function quantityDisplay(
  quantity: number,
  item: Pick<PackageSnapshot, 'packQuantity' | 'packType' | 'packUnit'>,
) {
  const packs = Math.floor(quantity / item.packQuantity)
  const remainder = quantity % item.packQuantity
  return `${packs} ${item.packType}${packs === 1 ? '' : 's'}${remainder ? ` + ${remainder} ${item.packUnit}` : ''}`
}
export function baseQuantity(packages: number, packQuantity: number) {
  const value = packages * packQuantity
  const rounded = Math.round(value)
  if (!Number.isFinite(value) || value <= 0 || Math.abs(value - rounded) > 0.000001 || rounded > 4294967295)
    throw new Error('Enter a quantity that equals a positive whole number of base units')
  return rounded
}
