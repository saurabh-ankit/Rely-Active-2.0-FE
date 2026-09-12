import { useLocation, useNavigate } from 'react-router-dom'
export const inventoryBase = '/global-settings/inventory'
export const categoryPath = (id: string) => `${inventoryBase}/categories/${id}`
export function inventoryReturnUrl(path: string, search: string, categoryId?: string) {
  const params = new URLSearchParams(search)
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
