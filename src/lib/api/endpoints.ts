export const BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string) ||
  (import.meta.env.VITE_API_URL as string) ||
  'http://localhost:3002/api/v1'

// Helper to construct location-scoped endpoints with locationId query parameter
export const buildLocationEndpoint = (path: string, locationId?: string | null): string => {
  if (!locationId) return `${BASE_URL}${path}`
  const joiner = path.includes('?') ? '&' : '?'
  return `${BASE_URL}${path}${joiner}locationId=${encodeURIComponent(locationId)}`
}

export const API_ENDPOINTS = {
  // =========================================================================
  // GLOBAL ENDPOINTS (System, Authentication, Company, & SuperAdmin Config)
  // =========================================================================
  auth: {
    login: `${BASE_URL}/auth/login`,
    profile: `${BASE_URL}/auth/profile`,
  },

  company: {
    getAll: `${BASE_URL}/company`,
    getById: (id: string) => `${BASE_URL}/company/${id}`,
    create: `${BASE_URL}/company`,
    update: (id: string) => `${BASE_URL}/company/${id}`,
    getSetupStatus: `${BASE_URL}/company/company-setup/status`,
  },

  property: {
    getAll: `${BASE_URL}/property`,
    getById: (id: string) => `${BASE_URL}/property/${id}`,
    create: `${BASE_URL}/property`,
    update: (id: string) => `${BASE_URL}/property/${id}`,
    delete: (id: string) => `${BASE_URL}/property/${id}`,
  },

  resident: {
    getAll: `${BASE_URL}/residents`,
    getById: (id: string) => `${BASE_URL}/residents/${id}`,
    getByUnit: (unitId: string) => `${BASE_URL}/residents/unit/${unitId}`,
    create: `${BASE_URL}/residents`,
    update: (id: string) => `${BASE_URL}/residents/${id}`,
    delete: (id: string) => `${BASE_URL}/residents/${id}`,
    login: `${BASE_URL}/residents/auth/login`,
  },

  globalRbac: {
    getRoles: `${BASE_URL}/roles`,
    createRole: `${BASE_URL}/roles`,
    updateRolePermissions: (roleId: string) => `${BASE_URL}/roles/${roleId}/permissions`,
    getResources: `${BASE_URL}/resources`,
    getDepartments: `${BASE_URL}/departments`,
    getModules: `${BASE_URL}/permissions/modules`,
    getPermissions: `${BASE_URL}/permissions`,
  },

  // =========================================================================
  // LOCATION-SCOPED MODULE ENDPOINTS (Triggered from Side-Bar Modules)
  // =========================================================================
  user: {
    getUsers: `${BASE_URL}/users`,
    getUsersForLocation: (locationId?: string | null) => buildLocationEndpoint('/users', locationId),
    createUser: `${BASE_URL}/users`,
    getUserById: (id: string) => `${BASE_URL}/users/${id}`,
    updateUser: (id: string) => `${BASE_URL}/users/${id}`,
    assignRole: (id: string) => `${BASE_URL}/users/${id}/roles`,
    updateProperties: (id: string) => `${BASE_URL}/users/${id}/properties`,
    updatePermissions: (id: string) => `${BASE_URL}/users/${id}/permissions`,
    getAccessibleProperties: `${BASE_URL}/users/accessible-properties`,
  },

  rbac: {
    getRoles: `${BASE_URL}/roles`,
    createRole: `${BASE_URL}/roles`,
    updateRolePermissions: (roleId: string) => `${BASE_URL}/roles/${roleId}/permissions`,
    getResources: `${BASE_URL}/resources`,
    getLocationPermissions: (userId: string, locationId: string) =>
      `${BASE_URL}/resources/users/${userId}/location-permissions?locationId=${locationId}`,
    saveLocationPermissions: (userId: string) => `${BASE_URL}/resources/users/${userId}/location-permissions`,
    getDepartments: `${BASE_URL}/departments`,
    getModules: `${BASE_URL}/permissions/modules`,
    getPermissions: `${BASE_URL}/permissions`,
  },

  // Side-bar Module Endpoints
  modules: {
    employees: (locationId?: string | null) => buildLocationEndpoint('/users', locationId),
    residents: (locationId?: string | null) => buildLocationEndpoint('/residents', locationId),
    roster: (locationId?: string | null) => buildLocationEndpoint('/roster', locationId),
    tickets: (locationId?: string | null) => buildLocationEndpoint('/tickets', locationId),
    security: (locationId?: string | null) => buildLocationEndpoint('/security', locationId),
    inventory: (locationId?: string | null) => buildLocationEndpoint('/inventory', locationId),
    assets: (locationId?: string | null) => buildLocationEndpoint('/assets', locationId),
  },

  // Asset Management Endpoints
  assetManagement: {
    categories: {
      list: `${BASE_URL}/location/:locationId/assets/categories`,
      create: `${BASE_URL}/location/:locationId/assets/categories`,
      get: `${BASE_URL}/location/:locationId/assets/categories/:id`,
      update: `${BASE_URL}/location/:locationId/assets/categories/:id`,
      delete: `${BASE_URL}/location/:locationId/assets/categories/:id`,
    },
    vendors: {
      list: `${BASE_URL}/location/:locationId/assets/vendors`,
      create: `${BASE_URL}/location/:locationId/assets/vendors`,
      get: `${BASE_URL}/location/:locationId/assets/vendors/:id`,
      update: `${BASE_URL}/location/:locationId/assets/vendors/:id`,
      delete: `${BASE_URL}/location/:locationId/assets/vendors/:id`,
      dropdown: `${BASE_URL}/location/:locationId/assets/vendors/dropdown/list`,
    },
    items: {
      list: `${BASE_URL}/location/:locationId/assets/items`,
      create: `${BASE_URL}/location/:locationId/assets/items`,
      get: `${BASE_URL}/location/:locationId/assets/items/:id`,
      update: `${BASE_URL}/location/:locationId/assets/items/:id`,
      delete: `${BASE_URL}/location/:locationId/assets/items/:id`,
      dropdown: `${BASE_URL}/location/:locationId/assets/items/dropdown/list`,
    },
    assets: {
      list: `${BASE_URL}/location/:locationId/assets`,
      create: `${BASE_URL}/location/:locationId/assets`,
      get: `${BASE_URL}/location/:locationId/assets/:id`,
      update: `${BASE_URL}/location/:locationId/assets/:id`,
      delete: `${BASE_URL}/location/:locationId/assets/:id`,
      stats: `${BASE_URL}/location/:locationId/assets/stats`,
    },
    assignments: {
      list: `${BASE_URL}/location/:locationId/assets/assignments`,
      create: `${BASE_URL}/location/:locationId/assets/assignments`,
      get: `${BASE_URL}/location/:locationId/assets/assignments/:id`,
      return: `${BASE_URL}/location/:locationId/assets/assignments/:id/return`,
      active: `${BASE_URL}/location/:locationId/assets/assignments/active/list`,
    },
    assignees: {
      employees: `${BASE_URL}/location/:locationId/assets/assignees/employees`,
      residents: `${BASE_URL}/location/:locationId/assets/assignees/residents`,
      patients: `${BASE_URL}/location/:locationId/assets/assignees/patients`,
      rooms: `${BASE_URL}/location/:locationId/assets/assignees/rooms`,
      beds: `${BASE_URL}/location/:locationId/assets/assignees/beds`,
    },
    maintenance: {
      serviceLogs: {
        list: `${BASE_URL}/location/:locationId/assets/maintenance/service-logs`,
        create: `${BASE_URL}/location/:locationId/assets/maintenance/service-logs`,
        update: `${BASE_URL}/location/:locationId/assets/maintenance/service-logs/:id`,
        delete: `${BASE_URL}/location/:locationId/assets/maintenance/service-logs/:id`,
        complete: `${BASE_URL}/location/:locationId/assets/maintenance/service-logs/:id/complete`,
      },
      warranties: {
        list: `${BASE_URL}/location/:locationId/assets/maintenance/warranties`,
        create: `${BASE_URL}/location/:locationId/assets/maintenance/warranties`,
        update: `${BASE_URL}/location/:locationId/assets/maintenance/warranties/:id`,
        delete: `${BASE_URL}/location/:locationId/assets/maintenance/warranties/:id`,
      },
      calibrations: {
        list: `${BASE_URL}/location/:locationId/assets/maintenance/calibrations`,
        create: `${BASE_URL}/location/:locationId/assets/maintenance/calibrations`,
        update: `${BASE_URL}/location/:locationId/assets/maintenance/calibrations/:id`,
        delete: `${BASE_URL}/location/:locationId/assets/maintenance/calibrations/:id`,
      },
      upcoming: `${BASE_URL}/location/:locationId/assets/maintenance/upcoming`,
    },
    compliance: {
      certifications: {
        list: `${BASE_URL}/location/:locationId/assets/compliance/certifications`,
        create: `${BASE_URL}/location/:locationId/assets/compliance/certifications`,
        update: `${BASE_URL}/location/:locationId/assets/compliance/certifications/:id`,
        delete: `${BASE_URL}/location/:locationId/assets/compliance/certifications/:id`,
        expiring: `${BASE_URL}/location/:locationId/assets/compliance/certifications/expiring`,
      },
      inspections: {
        list: `${BASE_URL}/location/:locationId/assets/compliance/inspections`,
        create: `${BASE_URL}/location/:locationId/assets/compliance/inspections`,
        update: `${BASE_URL}/location/:locationId/assets/compliance/inspections/:id`,
        delete: `${BASE_URL}/location/:locationId/assets/compliance/inspections/:id`,
      },
      training: {
        list: `${BASE_URL}/location/:locationId/assets/compliance/training`,
        create: `${BASE_URL}/location/:locationId/assets/compliance/training`,
        update: `${BASE_URL}/location/:locationId/assets/compliance/training/:id`,
        delete: `${BASE_URL}/location/:locationId/assets/compliance/training/:id`,
      },
      status: `${BASE_URL}/location/:locationId/assets/compliance/status`,
    },
    bulk: {
      template: `${BASE_URL}/location/:locationId/assets/bulk/template`,
      upload: `${BASE_URL}/location/:locationId/assets/bulk/upload`,
    },
    complianceStatus: {
      get: `${BASE_URL}/location/:locationId/assets/compliance/status`,
    },
  },

  // Roster Module Endpoints
  roster: {
    onboardDoctor: (companyId: string, locationId: string) =>
      `${BASE_URL}/roster/companies/${companyId}/locations/${locationId}/doctors/onboard`,
    getDoctors: (companyId: string, locationId: string) =>
      `${BASE_URL}/roster/companies/${companyId}/locations/${locationId}/doctors`,
    addDoctorLocation: (doctorProfileId: string) => `${BASE_URL}/roster/doctors/${doctorProfileId}/locations`,
    addDoctorEngagement: (doctorProfileId: string) => `${BASE_URL}/roster/doctors/${doctorProfileId}/engagements`,
    createShift: (companyId: string, locationId: string) =>
      `${BASE_URL}/roster/companies/${companyId}/locations/${locationId}/shifts`,
    getShifts: (companyId: string, locationId: string) =>
      `${BASE_URL}/roster/companies/${companyId}/locations/${locationId}/shifts`,
    updateShift: (companyId: string, locationId: string, shiftId: string) =>
      `${BASE_URL}/roster/companies/${companyId}/locations/${locationId}/shifts/${shiftId}`,
    createFrequency: (companyId: string, locationId: string) =>
      `${BASE_URL}/roster/companies/${companyId}/locations/${locationId}/frequencies`,
    getFrequencies: (companyId: string, locationId: string) =>
      `${BASE_URL}/roster/companies/${companyId}/locations/${locationId}/frequencies`,
    validateAssignment: (companyId: string, locationId: string) =>
      `${BASE_URL}/roster/companies/${companyId}/locations/${locationId}/assignments/validate`,
    getAssignments: (companyId: string, locationId: string) =>
      `${BASE_URL}/roster/companies/${companyId}/locations/${locationId}/assignments`,
    createAssignment: (companyId: string, locationId: string) =>
      `${BASE_URL}/roster/companies/${companyId}/locations/${locationId}/assignments`,
    publishAssignment: (companyId: string, locationId: string, id: string) =>
      `${BASE_URL}/roster/companies/${companyId}/locations/${locationId}/assignments/${id}/publish`,
    copyAssignment: (companyId: string, locationId: string, id: string) =>
      `${BASE_URL}/roster/companies/${companyId}/locations/${locationId}/assignments/${id}/copy-forward`,
    getRosterDates: (companyId: string, locationId: string) =>
      `${BASE_URL}/roster/companies/${companyId}/locations/${locationId}/roster-dates`,
    requestReplacement: (companyId: string, locationId: string, dateId: string) =>
      `${BASE_URL}/roster/companies/${companyId}/locations/${locationId}/roster-dates/${dateId}/replace`,
    getSchedulingResources: (companyId: string, locationId: string) =>
      `${BASE_URL}/roster/companies/${companyId}/locations/${locationId}/scheduling-resources`,
    syncSchedulingResources: (companyId: string, locationId: string) =>
      `${BASE_URL}/roster/companies/${companyId}/locations/${locationId}/scheduling-resources/sync`,
    getOpdSlots: (companyId: string, locationId: string, dateId: string) =>
      `${BASE_URL}/roster/companies/${companyId}/locations/${locationId}/roster-dates/${dateId}/opd-slots`,
    bookOpdSlot: (companyId: string, locationId: string, slotId: string) =>
      `${BASE_URL}/roster/companies/${companyId}/locations/${locationId}/opd-slots/${slotId}/book`,
    cancelOpdBooking: (companyId: string, locationId: string, bookingId: string) =>
      `${BASE_URL}/roster/companies/${companyId}/locations/${locationId}/opd-bookings/${bookingId}`,
  },
}
