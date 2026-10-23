import { redirect } from 'next/navigation';

export default function SendPage() {
  redirect('/app?tab=send');
}
