import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import {
  DEFAULT_ROLE_PERMISSIONS,
  ROLE_META,
  type Permission,
  type Role,
  type RoleDef,
} from '../lib/permissionDefs';

interface RolesContextValue {
  rolesList: RoleDef[];
  rolePermissionsMap: Record<string, Permission[]>;
  roleMeta: Record<Role, { ar: string; en: string }>;
  loading: boolean;
  refresh: () => Promise<void>;
  saveRole: (role: Role, permissions: Permission[]) => Promise<boolean>;
}

const RolesContext = createContext<RolesContextValue | undefined>(undefined);

export function RolesProvider({ children }: { children: ReactNode }) {
  const [rolesList, setRolesList] = useState<RoleDef[]>([]);
  const [loading, setLoading] = useState(true);
  const { session } = useAuth();

  const refresh = useCallback(async () => {
    if (!session) {
      setRolesList([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase.from('roles').select('*');
    if (!error && Array.isArray(data)) {
      const list: RoleDef[] = (data as Array<{
        role: Role;
        name_ar: string;
        name_en: string;
        permissions: unknown;
        updated_at?: string;
      }>).map((row) => ({
        role: row.role,
        name_ar: row.name_ar,
        name_en: row.name_en,
        permissions: normalizePermissions(row.permissions),
        updated_at: row.updated_at,
      }));
      setRolesList(list);
    }
    setLoading(false);
  }, [session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const rolePermissionsMap = useMemo(() => {
    const map: Record<string, Permission[]> = {};
    for (const def of rolesList) map[def.role] = def.permissions;
    if (Object.keys(map).length === 0) {
      for (const role of Object.keys(DEFAULT_ROLE_PERMISSIONS) as Role[]) {
        map[role] = DEFAULT_ROLE_PERMISSIONS[role];
      }
    }
    return map;
  }, [rolesList]);

  const roleMeta = useMemo(() => {
    const meta: Record<Role, { ar: string; en: string }> = { ...ROLE_META };
    for (const def of rolesList) {
      if (meta[def.role]) {
        meta[def.role] = { ar: def.name_ar || meta[def.role].ar, en: def.name_en || meta[def.role].en };
      }
    }
    return meta;
  }, [rolesList]);

  const saveRole = useCallback(async (role: Role, permissions: Permission[]): Promise<boolean> => {
    const existing = rolesList.find((r) => r.role === role);
    const payload = {
      role,
      name_ar: (existing?.name_ar ?? ROLE_META[role].ar),
      name_en: (existing?.name_en ?? ROLE_META[role].en),
      permissions,
      updated_at: new Date().toISOString(),
    };
    const { error } = existing
      ? await supabase.from('roles').update(payload).eq('role', role)
      : await supabase.from('roles').insert(payload);
    if (error) return false;
    await refresh();
    return true;
  }, [rolesList, refresh]);

  return (
    <RolesContext.Provider value={{ rolesList, rolePermissionsMap, roleMeta, loading, refresh, saveRole }}>
      {children}
    </RolesContext.Provider>
  );
}

function normalizePermissions(value: unknown): Permission[] {
  if (!Array.isArray(value)) return [];
  return value.filter((p): p is Permission => typeof p === 'string');
}

export function useRoles() {
  const ctx = useContext(RolesContext);
  if (!ctx) throw new Error('useRoles must be used within RolesProvider');
  return ctx;
}
