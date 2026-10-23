import { auth } from '@/lib/auth/server';
import { redirect } from 'next/navigation';
import { OverviewDashboard } from '../components/dashboard/overview-dashboard';
import type { DashboardTab } from '../components/dashboard/sidebar';

// Must be dynamic so auth.getSession() fires on every request
export const dynamic = 'force-dynamic';

const VALID_TABS: readonly DashboardTab[] = [
  'overview',
  'send',
  'exchange',
  'activity',
  'wallet',
  'account',
] as const;

/**
 * /app — Main authenticated dashboard entry point.
 * proxy.ts redirects unauthenticated requests to "/" before reaching here,
 * but we keep the guard as a defence-in-depth measure.
 */
export default async function AppPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    redirect('/auth/sign-in');
  }
  const user = session.user;

  const rawName = user.name
    ? user.name.split(' ')[0]
    : user.email
    ? user.email.split('@')[0]
    : 'User';
  const userName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

  const resolvedParams = searchParams ? await searchParams : undefined;
  const initialTab =
    resolvedParams?.tab && VALID_TABS.includes(resolvedParams.tab as DashboardTab)
      ? (resolvedParams.tab as DashboardTab)
      : 'overview';

  return (
    <OverviewDashboard
      userName={userName}
      userSession={user}
      initialTab={initialTab}
    />
  );
}
