import { redirect } from 'next/navigation';

export default function ActivityPage() {
  redirect('/app?tab=activity');
}
