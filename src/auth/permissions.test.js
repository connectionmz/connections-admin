import { ADMIN_ROLES, hasAnyRole, normalizeRoles } from './permissions';

describe('admin permissions', () => {
  test('normalizes the legacy singular role', () => {
    expect(normalizeRoles({ role: ADMIN_ROLES.ADMIN })).toEqual([ADMIN_ROLES.ADMIN]);
  });

  test('preserves the current roles array', () => {
    expect(normalizeRoles({ roles: [ADMIN_ROLES.ADMIN, ADMIN_ROLES.ACCOUNTANT] })).toEqual([
      ADMIN_ROLES.ADMIN,
      ADMIN_ROLES.ACCOUNTANT,
    ]);
  });

  test('grants access when at least one role is allowed', () => {
    expect(hasAnyRole(
      { roles: [ADMIN_ROLES.COMPANY_MANAGER] },
      [ADMIN_ROLES.ADMIN, ADMIN_ROLES.COMPANY_MANAGER]
    )).toBe(true);
  });

  test('denies access to missing and unrelated roles', () => {
    expect(hasAnyRole({}, [ADMIN_ROLES.ADMIN])).toBe(false);
    expect(hasAnyRole({ roles: [ADMIN_ROLES.ACCOUNTANT] }, [ADMIN_ROLES.ADMIN])).toBe(false);
  });
});
