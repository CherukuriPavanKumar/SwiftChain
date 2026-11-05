'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { User, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react';
import { SwiftChainLogo } from '@/app/components/dashboard/token-icons';
import { signUpWithEmail } from './actions';

export default function SignUpPage() {
  const [state, formAction, isPending] = useActionState(signUpWithEmail, null);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen bg-[#071410] text-[#F4F1E8] flex flex-col justify-between selection:bg-[#8BE3BB]/30 selection:text-[#8BE3BB] antialiased">
      {/* ─── Header ────────────────────────────────────────────────────────── */}
      <header className="w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 pt-6 pb-6 flex items-center justify-between">
        {/* Brand Mark */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group"
          aria-label="SwiftChain Home"
        >
          <SwiftChainLogo className="w-5 h-5 text-[#8BE3BB]" />
          <span className="text-base font-bold text-[#F4F1E8] tracking-tight">
            SwiftChain
          </span>
        </Link>

        {/* Sepolia Testnet Indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0d1e17] border border-[#233a30] text-xs text-[#a6b8b0] font-normal">
          <span className="w-1.5 h-1.5 rounded-full bg-[#8BE3BB]" />
          <span>Sepolia testnet</span>
        </div>
      </header>

      {/* ─── Main Two-Column Content ────────────────────────────────────────── */}
      <main className="flex-1 flex items-center justify-center py-8 sm:py-12 px-6 sm:px-10 lg:px-12 w-full max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-0 items-center w-full">
          {/* Left Column: Brand Statement (Bold display typography as requested) */}
          <div className="lg:pr-16 lg:border-r lg:border-[#233a30] flex flex-col justify-center">
            <p className="text-xs text-[#7a9187] font-normal mb-3 tracking-normal">
              Cross-border settlement
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-[56px] xl:text-[60px] font-bold text-[#F4F1E8] tracking-[-0.03em] leading-[1.08] mb-6">
              Global <br />
              payments, <br />
              <span className="text-[#8BE3BB]">reimagined.</span>
            </h1>
            <p className="text-base sm:text-lg text-[#a6b8b0] leading-relaxed max-w-md font-normal">
              A simpler way to move value across borders using stablecoins and
              verifiable on-chain transactions.
            </p>
          </div>

          {/* Right Column: Authentication Card */}
          <div className="lg:pl-16 flex justify-center lg:justify-start">
            <div className="w-full max-w-[440px] bg-[#0d1e17] border border-[#233a30] rounded-xl p-6 sm:p-8 shadow-[0_16px_36px_rgba(0,0,0,0.4)]">
              {/* Card Header */}
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-[#F4F1E8] tracking-tight mb-1.5">
                  Create an account
                </h2>
                <p className="text-xs sm:text-sm text-[#a6b8b0] leading-normal max-w-xs mx-auto">
                  Access remittance transfers, live quotes, and settlement history.
                </p>
              </div>

              {/* Sign Up Form */}
              <form action={formAction} className="space-y-4">
                {/* Full Name Field */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="name"
                    className="block text-xs sm:text-[13px] font-medium text-[#F4F1E8]"
                  >
                    Full name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#7a9187] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none stroke-[1.5]" />
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      autoComplete="name"
                      placeholder="Jane Doe"
                      className="w-full pl-10 pr-4 py-2.5 bg-[#071410] border border-[#233a30] rounded-lg text-sm text-[#F4F1E8] placeholder-[#7a9187]/60 focus:outline-none focus:border-[#8BE3BB] focus:ring-1 focus:ring-[#8BE3BB] transition-colors"
                    />
                  </div>
                </div>

                {/* Email Address Field */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="email"
                    className="block text-xs sm:text-[13px] font-medium text-[#F4F1E8]"
                  >
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#7a9187] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none stroke-[1.5]" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-[#071410] border border-[#233a30] rounded-lg text-sm text-[#F4F1E8] placeholder-[#7a9187]/60 focus:outline-none focus:border-[#8BE3BB] focus:ring-1 focus:ring-[#8BE3BB] transition-colors"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="password"
                      className="block text-xs sm:text-[13px] font-medium text-[#F4F1E8]"
                    >
                      Password
                    </label>
                    <span className="text-[11px] text-[#7a9187]">At least 8 chars</span>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#7a9187] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none stroke-[1.5]" />
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      placeholder="Create a secure password"
                      className="w-full pl-10 pr-11 py-2.5 bg-[#071410] border border-[#233a30] rounded-lg text-sm text-[#F4F1E8] placeholder-[#7a9187]/60 focus:outline-none focus:border-[#8BE3BB] focus:ring-1 focus:ring-[#8BE3BB] transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7a9187] hover:text-[#F4F1E8] p-1 rounded-md transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#8BE3BB]"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4 stroke-[1.5]" />
                      ) : (
                        <Eye className="w-4 h-4 stroke-[1.5]" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Error Banner */}
                {state?.error && (
                  <div
                    role="alert"
                    className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs sm:text-sm flex items-start gap-2.5"
                  >
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5 stroke-[1.5]" />
                    <span>{state.error}</span>
                  </div>
                )}

                {/* Primary Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="w-full py-2.5 px-4 rounded-lg bg-[#8BE3BB] hover:bg-[#a1ecd0] disabled:opacity-50 disabled:cursor-not-allowed text-[#071410] text-sm font-bold transition-colors shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-[#8BE3BB]"
                  >
                    {isPending ? (
                      <>
                        <span className="w-4 h-4 border-2 border-[#071410]/30 border-t-[#071410] rounded-full animate-spin" />
                        <span>Creating account...</span>
                      </>
                    ) : (
                      <>
                        <span>Create account</span>
                        <ArrowRight className="w-4 h-4 stroke-[1.5]" />
                      </>
                    )}
                  </button>
                </div>

                {/* Quiet Divider */}
                <div className="relative my-5 flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#233a30]" />
                  </div>
                  <div className="relative bg-[#0d1e17] px-3 text-xs text-[#7a9187]">
                    or
                  </div>
                </div>

                {/* Sign In Link */}
                <div className="text-center text-xs sm:text-[13px] text-[#a6b8b0]">
                  Already have an account?{' '}
                  <Link
                    href="/auth/sign-in"
                    className="text-[#8BE3BB] hover:underline font-semibold ml-1 transition-colors"
                  >
                    Sign in
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* ─── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="w-full border-t border-[#233a30] py-6 px-6 sm:px-10 lg:px-12 bg-[#040a08]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#7a9187]">
          <p>© 2026 SwiftChain. A blockchain-powered remittance prototype.</p>
          <div className="flex items-center gap-6">
            <a
              href="https://github.com/CherukuriPavanKumar/SwiftChain#readme"
              target="_blank"
              rel="noreferrer"
              className="text-[#a6b8b0] hover:text-[#F4F1E8] transition-colors"
            >
              Docs
            </a>
            <a
              href="https://github.com/CherukuriPavanKumar/SwiftChain"
              target="_blank"
              rel="noreferrer"
              className="text-[#a6b8b0] hover:text-[#F4F1E8] transition-colors"
            >
              GitHub
            </a>
            <span className="text-[#7a9187]/60">
              Sepolia Testnet
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
