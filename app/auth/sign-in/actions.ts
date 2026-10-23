'use server';

import { auth } from '@/lib/auth/server';
import { redirect } from 'next/navigation';

export async function signInWithEmail(
  _prevState: { error: string } | null,
  formData: FormData
) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !email.trim()) {
    return { error: "Email address is required." };
  }

  if (!password) {
    return { error: "Password is required." };
  }

  const { error } = await auth.signIn.email({
    email: email.trim(),
    password,
  });

  if (error) {
    return { error: error.message || 'Failed to sign in. Please check your credentials.' };
  }

  redirect('/app');
}
