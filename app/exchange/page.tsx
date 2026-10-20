import { auth } from '@/lib/auth/server';
import { redirect } from 'next/navigation';
import { OverviewDashboard } from '../components/dashboard/overview-dashboard';

// Must be dynamic so auth.getSession() fires on every request
export const dynamic = 'force-dynamic';

export default async function ExchangePage() {
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

  return <OverviewDashboard userName={userName} initialTab="exchange" userSession={user} />;
}
