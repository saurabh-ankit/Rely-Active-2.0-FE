import { useLocation, useNavigate } from 'react-router-dom'
export const inventoryBase = '/global-settings/inventory'
export const categoryPath = (id: string) => `${inventoryBase}/categories/${id}`
export function inventoryReturnUrl(path: string, search: string, categoryId?: string) {
  const params = new URLSearchParams(search)
  const backTo = params.get('backTo')
  if (
    backTo &&
    (backTo.startsWith(`${inventoryBase}/`) ||
      backTo.startsWith(`${inventoryBase}?`) ||
      backTo.startsWith('/admin/inventory/'))
  )
    return backTo
  if (categoryId && params.get('returnTo') === 'category') {
    path = categoryPath(categoryId)
    params.delete('returnTo')
  }
  return `${path}${params.size ? `?${params}` : ''}`
}
export function useInventoryNavigation(returnPath: string, categoryId?: string) {
  const location = useLocation()
  const navigate = useNavigate()
  return { back: () => navigate(inventoryReturnUrl(returnPath, location.search, categoryId)), search: location.search }
}

export function withInventoryReturn(target: string, returnTo: string) {
  const [path, query = ''] = target.split('?')
  const params = new URLSearchParams(query)
  params.set('backTo', returnTo)
  return `${path}?${params}`
}
