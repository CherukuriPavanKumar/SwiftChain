'use server';

import { auth } from '@/lib/auth/server';
import { redirect } from 'next/navigation';

export async function signUpWithEmail(
  _prevState: { error: string } | null,
  formData: FormData
) {
  const email = formData.get('email') as string;
  const name = formData.get('name') as string;
  const password = formData.get('password') as string;

  if (!email || !email.trim()) {
    return { error: "Email address must be provided." };
  }

  if (!password || password.length < 8) {
    return { error: "Password must be at least 8 characters long." };
  }

  const { error } = await auth.signUp.email({
    email: email.trim(),
    name: name?.trim() || email.split('@')[0],
    password,
  });

  if (error) {
    return { error: error.message || 'Failed to create account' };
  }

  redirect('/app');
}
