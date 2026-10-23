import { redirect } from 'next/navigation';

export default function ExchangePage() {
  redirect('/app?tab=exchange');
}
