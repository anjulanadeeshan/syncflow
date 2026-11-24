import { AccessDenied } from '@/components/authorization/access-denied';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';

export default function AccessDeniedPage() {
  return (
    <DashboardShell
      title="Access denied"
      description="Your account does not have the required permission."
    >
      <AccessDenied />
    </DashboardShell>
  );
}
