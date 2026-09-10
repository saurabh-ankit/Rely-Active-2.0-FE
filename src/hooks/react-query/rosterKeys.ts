export const ROSTER_KEYS = {
  all: ['roster'] as const,
  shifts: (locationId?: string | null) => ['shifts', locationId] as const,
  employeeShifts: (locationId?: string | null, employeeId?: string) =>
    ['employee-shifts', locationId, employeeId || 'all'] as const,
  shiftEmployeeDates: (locationId?: string | null, params?: Record<string, unknown>) =>
    ['shift-employee-dates', locationId, params] as const,
  residentPools: (locationId?: string | null, params?: Record<string, unknown>) =>
    ['shift-resident-pools', locationId, params] as const,
  areas: (locationId?: string | null, params?: Record<string, unknown>) =>
    ['roster-areas', locationId, params] as const,
} as const
