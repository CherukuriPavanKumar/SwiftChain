import { auth } from '@/lib/auth/server';
import { OverviewDashboard } from './components/dashboard/overview-dashboard';

// Must be dynamic so auth.getSession() fires on every request
export const dynamic = 'force-dynamic';

export default async function Home() {
  const { data: session } = await auth.getSession();
  const user = session?.user;

  // Derive human-readable name, defaulting to Pavan as in design reference
  const rawName = user?.name ? user.name.split(' ')[0] : (user?.email ? user.email.split('@')[0] : 'Pavan');
  const userName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

  return <OverviewDashboard userName={userName} userSession={user} />;
}
