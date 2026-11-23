'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ApiError } from '@/lib/auth/api';
import { useAuth } from '@/lib/auth/auth-context';
import { listOrganizations } from './api';
import type { OrganizationSummary } from './types';

const STORAGE_KEY = 'syncflow.selectedOrganizationId';

type OrganizationContextValue = {
  organizations: OrganizationSummary[];
  selectedOrganization: OrganizationSummary | null;
  isLoading: boolean;
  error: string;
  selectOrganization: (organizationId: string) => void;
  reloadOrganizations: () => Promise<OrganizationSummary[]>;
};

const OrganizationContext = createContext<OrganizationContextValue | null>(null);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const reloadOrganizations = useCallback(async () => {
    if (!user) {
      setOrganizations([]);
      setSelectedId('');
      return [];
    }
    setIsLoading(true);
    setError('');
    try {
      const response = await listOrganizations();
      setOrganizations(response.organizations);
      setSelectedId((current) => {
        const stored = window.localStorage.getItem(STORAGE_KEY) ?? '';
        const preferred = current || stored;
        const next = response.organizations.some((item) => item.id === preferred)
          ? preferred
          : (response.organizations[0]?.id ?? '');
        if (next) window.localStorage.setItem(STORAGE_KEY, next);
        else window.localStorage.removeItem(STORAGE_KEY);
        return next;
      });
      return response.organizations;
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'Unable to load organizations.',
      );
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    const timer = window.setTimeout(() => void reloadOrganizations(), 0);
    return () => window.clearTimeout(timer);
  }, [authLoading, reloadOrganizations]);

  const selectOrganization = useCallback((organizationId: string) => {
    setSelectedId(organizationId);
    window.localStorage.setItem(STORAGE_KEY, organizationId);
  }, []);

  const selectedOrganization =
    organizations.find((organization) => organization.id === selectedId) ?? null;
  const value = useMemo(
    () => ({
      organizations,
      selectedOrganization,
      isLoading,
      error,
      selectOrganization,
      reloadOrganizations,
    }),
    [
      organizations,
      selectedOrganization,
      isLoading,
      error,
      selectOrganization,
      reloadOrganizations,
    ],
  );

  return <OrganizationContext value={value}>{children}</OrganizationContext>;
}

export function useOrganizations(): OrganizationContextValue {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganizations must be used within OrganizationProvider.');
  }
  return context;
}
