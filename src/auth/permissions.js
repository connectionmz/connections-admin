export const ADMIN_ROLES = Object.freeze({
  ADMIN: 'admin',
  ACCOUNTANT: 'contabilista',
  COMPANY_MANAGER: 'gestor de empresas',
  QUOTATION_MANAGER: 'gestor de cotações',
  SERVICES_MANAGER: 'gestor de serviços',
});

export const normalizeRoles = (profile = {}) => {
  if (Array.isArray(profile.roles)) return profile.roles.filter(Boolean);
  return profile.role ? [profile.role] : [];
};

export const hasAnyRole = (profile, allowedRoles = []) => {
  const roles = normalizeRoles(profile);
  return allowedRoles.some(role => roles.includes(role));
};
