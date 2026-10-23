'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { SwiftChainLogo } from '@/app/components/dashboard/token-icons';
import { signInWithEmail } from './actions';

export default function SignInPage() {
  const [state, formAction, isPending] = useActionState(signInWithEmail, null);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen bg-[#071410] text-[#F4F1E8] flex flex-col justify-between selection:bg-[#8BE3BB]/30 selection:text-[#8BE3BB] antialiased">
      {/* ─── Header ────────────────────────────────────────────────────────── */}
      <header className="w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 pt-8 pb-6 flex items-center justify-between">
        {/* Brand Mark */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group"
          aria-label="SwiftChain Home"
        >
          <SwiftChainLogo className="w-5 h-5 text-[#8BE3BB] group-hover:scale-105 transition-transform" />
          <span className="text-base font-bold text-[#F4F1E8] tracking-tight">
            SwiftChain
          </span>
        </Link>

        {/* Sepolia Testnet Pill Indicator */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#10231B] border border-[#294438] text-xs text-[#91AAA0] font-medium">
          <span className="w-2 h-2 rounded-full bg-[#8BE3BB] shadow-[0_0_8px_rgba(139,227,187,0.5)]" />
          <span>Sepolia Testnet</span>
        </div>
      </header>

      {/* ─── Main Two-Column Content ────────────────────────────────────────── */}
      <main className="flex-1 flex items-center justify-center py-8 sm:py-12 px-6 sm:px-10 lg:px-12 w-full max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-0 items-center w-full">
          {/* Left Column: Brand Message */}
          <div className="lg:pr-16 lg:border-r lg:border-[#294438]/40 flex flex-col justify-center">
            <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-[#91AAA0] mb-5">
              BLOCKCHAIN-POWERED REMITTANCE
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-[56px] xl:text-[60px] font-extrabold text-[#F4F1E8] tracking-[-0.035em] leading-[1.08] mb-6">
              Global <br />
              payments, <br />
              <span className="text-[#8BE3BB]">reimagined.</span>
            </h1>
            <p className="text-base sm:text-lg text-[#91AAA0] leading-relaxed max-w-md font-normal">
              A simpler way to move value across borders using stablecoins and
              transparent on-chain transactions.
            </p>
          </div>

          {/* Right Column: Authentication Form Card */}
          <div className="lg:pl-16 flex justify-center lg:justify-start">
            <div className="w-full max-w-[460px] bg-[#10231B] border border-[#294438] rounded-2xl p-7 sm:p-9 shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
              {/* Card Header */}
              <div className="text-center mb-7">
                <h2 className="text-2xl sm:text-[26px] font-bold text-[#F4F1E8] tracking-tight mb-2">
                  Sign in to SwiftChain
                </h2>
                <p className="text-xs sm:text-sm text-[#91AAA0] leading-normal max-w-xs mx-auto">
                  Access your remittance transfers, quotes, and settlement history.
                </p>
              </div>

              {/* Sign In Form */}
              <form action={formAction} className="space-y-4">
                {/* Email Address Field */}
                <div className="space-y-2">
                  <label
                    htmlFor="email"
                    className="block text-xs sm:text-[13px] font-medium text-[#F4F1E8]"
                  >
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#91AAA0] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-4 py-3 bg-[#071410] border border-[#294438] rounded-xl text-sm text-[#F4F1E8] placeholder-[#91AAA0]/50 focus:outline-none focus:border-[#8BE3BB] focus:ring-1 focus:ring-[#8BE3BB] transition-colors"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <label
                    htmlFor="password"
                    className="block text-xs sm:text-[13px] font-medium text-[#F4F1E8]"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#91AAA0] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      className="w-full pl-10 pr-11 py-3 bg-[#071410] border border-[#294438] rounded-xl text-sm text-[#F4F1E8] placeholder-[#91AAA0]/50 focus:outline-none focus:border-[#8BE3BB] focus:ring-1 focus:ring-[#8BE3BB] transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#91AAA0] hover:text-[#F4F1E8] p-1 rounded transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#8BE3BB]"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Error Banner */}
                {state?.error && (
                  <div
                    role="alert"
                    className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-start gap-2"
                  >
                    <span className="shrink-0 font-bold">⚠</span>
                    <span>{state.error}</span>
                  </div>
                )}

                {/* Primary Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="w-full py-3 px-4 rounded-xl bg-[#8BE3BB] hover:bg-[#a1ecd0] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed text-[#071410] text-sm font-semibold transition-all shadow-[0_2px_12px_rgba(139,227,187,0.2)] flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8BE3BB]"
                  >
                    {isPending ? (
                      <>
                        <span className="w-4 h-4 border-2 border-[#071410]/30 border-t-[#071410] rounded-full animate-spin" />
                        <span>Signing in...</span>
                      </>
                    ) : (
                      <>
                        <span>Sign in</span>
                        <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                      </>
                    )}
                  </button>
                </div>

                {/* Subtle Divider */}
                <div className="relative my-6 flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#294438]" />
                  </div>
                  <div className="relative bg-[#10231B] px-3 text-xs text-[#91AAA0]">
                    or
                  </div>
                </div>

                {/* Registration Link */}
                <div className="text-center text-xs sm:text-[13px] text-[#91AAA0]">
                  Don&apos;t have an account?{' '}
                  <Link
                    href="/auth/sign-up"
                    className="text-[#8BE3BB] hover:underline font-semibold ml-1 transition-colors"
                  >
                    Create an account
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* ─── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="w-full border-t border-[#294438]/50 py-6 px-6 sm:px-10 lg:px-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#91AAA0]">
          <p>© 2026 SwiftChain. A blockchain-powered remittance prototype.</p>
          <div className="flex items-center gap-6">
            <a
              href="https://github.com/CherukuriPavanKumar/SwiftChain#readme"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#F4F1E8] transition-colors"
            >
              Docs
            </a>
            <a
              href="https://github.com/CherukuriPavanKumar/SwiftChain"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#F4F1E8] transition-colors"
            >
              GitHub
            </a>
            <span className="text-[#91AAA0]/60 hover:text-[#91AAA0] cursor-default">
              Privacy
            </span>
            <span className="text-[#91AAA0]/60 hover:text-[#91AAA0] cursor-default">
              Terms
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
