import { redirect } from 'next/navigation';

/**
 * /landing — Canonical landing page is now served directly at "/".
 * proxy.ts redirects to "/" or "/app", and this redirect ensures fallback safety.
 */
export default function LandingPage() {
  redirect('/');
}
