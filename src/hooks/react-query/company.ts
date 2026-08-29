import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createCompanyAPI,
  getCompaniesAPI,
  getCompanyByIdAPI,
  getCompanySetupStatusAPI,
  saveCompanyFormDataAPI,
  updateCompanyAPI,
} from '@/lib/services/companyService'
import type { CompanyData } from '@/lib/types'

export const COMPANY_KEYS = {
  all: ['company'] as const,
  byId: (id?: string) => ['company', id] as const,
  setupStatus: ['company', 'setup-status'] as const,
}

export const useCompaniesQuery = () => {
  return useQuery({
    queryKey: COMPANY_KEYS.all,
    queryFn: getCompaniesAPI,
  })
}

export const useCompanyByIdQuery = (id?: string) => {
  return useQuery({
    queryKey: COMPANY_KEYS.byId(id),
    queryFn: () => getCompanyByIdAPI(id!),
    enabled: !!id,
  })
}

export const useCreateCompanyMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: Partial<CompanyData>) => createCompanyAPI(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMPANY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: COMPANY_KEYS.setupStatus })
    },
  })
}

export const useUpdateCompanyMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CompanyData> }) => updateCompanyAPI(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: COMPANY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: COMPANY_KEYS.byId(variables.id) })
      queryClient.invalidateQueries({ queryKey: COMPANY_KEYS.setupStatus })
    },
  })
}

export const useSaveCompanyFormDataMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ formData, id }: { formData: FormData; id?: string }) => saveCompanyFormDataAPI(formData, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMPANY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: COMPANY_KEYS.setupStatus })
    },
  })
}

export const useCompanySetupStatusQuery = () => {
  return useQuery({
    queryKey: COMPANY_KEYS.setupStatus,
    queryFn: getCompanySetupStatusAPI,
  })
}
