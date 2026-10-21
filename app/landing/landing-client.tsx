'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  Shield,
  Globe,
  ChevronDown,
  X,
  Menu,
} from 'lucide-react';
import { SwiftChainLogo } from '../components/dashboard/token-icons';

// ─── FAQ Accordion Item ──────────────────────────────────────────────────────
function FaqAccordionItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-[#294438]/60 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#8BE3BB] rounded transition-colors"
        aria-expanded={open}
      >
        <span className="text-base sm:text-lg font-medium text-[#F4F1E8] group-hover:text-[#8BE3BB] transition-colors pr-6">
          {q}
        </span>
        <ChevronDown
          className={`w-5 h-5 text-[#91AAA0] shrink-0 transition-transform duration-200 ${
            open ? 'rotate-180 text-[#8BE3BB]' : 'group-hover:text-[#F4F1E8]'
          }`}
        />
      </button>
      {open && (
        <div className="pb-5 text-sm sm:text-[15px] text-[#91AAA0] leading-relaxed animate-in fade-in-50 duration-200">
          {a}
        </div>
      )}
    </div>
  );
}

// ─── Main Landing Page Client Component ──────────────────────────────────────
export default function LandingClient() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  function scrollToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMobileMenuOpen(false);
  }

  const navLinks = [
    { label: 'Features', id: 'features' },
    { label: 'How it works', id: 'how-it-works' },
    { label: 'Tech stack', id: 'tech-stack' },
    { label: 'FAQs', id: 'faqs' },
  ];

  const features = [
    {
      num: '01',
      title: 'Lower costs',
      desc: 'Explore alternatives to traditional transfer rails. Avoid intermediate banking fees and opaque currency markups using stablecoin infrastructure.',
    },
    {
      num: '02',
      title: 'On-chain transparency',
      desc: 'Inspect supported testnet transactions directly on the public ledger. Every transfer hash can be verified on Etherscan.',
    },
    {
      num: '03',
      title: 'Simple experience',
      desc: 'A straightforward interface built around clear quote reviews, recipient inputs, and readable wallet actions—designed for real-world usability.',
    },
  ];

  const steps = [
    {
      num: '01',
      title: 'Enter an amount',
      desc: 'Input the desired transfer amount in INR and receive an estimated stablecoin conversion quote.',
    },
    {
      num: '02',
      title: 'Review the conversion quote',
      desc: 'Inspect the estimated exchange rate, network fees, and expected recipient token amount.',
    },
    {
      num: '03',
      title: 'Transfer on-chain',
      desc: 'Connect a supported wallet and dispatch funds across configured testnet rails.',
    },
    {
      num: '04',
      title: 'Inspect the transaction',
      desc: 'Track confirmation on-chain with simulated recipient currency payout calculations.',
    },
  ];

  const faqs = [
    {
      q: 'What is SwiftChain?',
      a: 'SwiftChain is a blockchain-powered remittance prototype exploring a simpler, more transparent experience for cross-border transfers using supported crypto assets.',
    },
    {
      q: 'Is SwiftChain live in production?',
      a: 'SwiftChain currently operates as a testnet prototype on Ethereum Sepolia. It is not a licensed production money-transfer service.',
    },
    {
      q: 'Do I need a cryptocurrency wallet to view this site?',
      a: 'No. You can explore the public landing page freely without connecting a wallet. A wallet like MetaMask is only needed when testing on-chain transfer flows inside the app.',
    },
    {
      q: 'Are real funds or fiat payouts involved?',
      a: 'All transactions use Sepolia testnet assets with zero real-world monetary value. Fiat payout amounts and comparison calculators represent simulated settlement values.',
    },
    {
      q: 'Can I inspect transaction records on-chain?',
      a: 'Yes. Every confirmed transaction yields an authentic transaction hash that can be inspected directly on Etherscan for Sepolia testnet.',
    },
  ];

  const techStack = [
    { layer: 'Interface', tech: 'Next.js 16 (App Router) + TypeScript', desc: 'React Server Components, dynamic streaming, and typed server actions.' },
    { layer: 'Blockchain', tech: 'wagmi v3 + viem', desc: 'EIP-1193 wallet connectors, EIP-1559 gas pricing, and Sepolia testnet interactions.' },
    { layer: 'Database', tech: 'Neon Serverless PostgreSQL + Drizzle ORM', desc: 'Serverless connection pooling with type-safe schema definitions and migrations.' },
    { layer: 'Authentication', tech: 'Neon Managed Better Auth', desc: 'Secure session cookies, per-user data isolation, and protected route proxying.' },
    { layer: 'Deployment', tech: 'Vercel Edge Network', desc: 'Continuous integration, branch preview environments, and global edge caching.' },
  ];

  return (
    <div className="min-h-screen bg-[#071410] text-[#F4F1E8] antialiased overflow-x-hidden selection:bg-[#8BE3BB]/30 selection:text-[#8BE3BB]">
      {/* ─── Top Navigation Bar ─────────────────────────────────────────── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
          scrolled ? 'bg-[#071410]/95 backdrop-blur-md border-b border-[#294438]/70 shadow-lg' : 'bg-transparent'
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 h-18 flex items-center justify-between gap-6">
          {/* Brand Mark */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group" aria-label="SwiftChain Home">
            <SwiftChainLogo className="w-5 h-5 text-[#8BE3BB] group-hover:scale-105 transition-transform" />
            <span className="text-base font-bold text-[#F4F1E8] tracking-tight">SwiftChain</span>
          </Link>

          {/* Centered Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8" aria-label="Main Navigation">
            {navLinks.map((link) => (
              <button
                key={link.id}
                type="button"
                onClick={() => scrollToSection(link.id)}
                className="text-sm font-medium text-[#91AAA0] hover:text-[#F4F1E8] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#8BE3BB] rounded"
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Right Action Area */}
          <div className="hidden md:flex items-center gap-3.5 shrink-0">
            {/* Sepolia Testnet Pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#10231B] border border-[#294438] text-xs text-[#91AAA0] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#6ED6A8] animate-pulse" />
              Sepolia Testnet
            </div>

            {/* Launch App Primary Button */}
            <Link
              href="/send"
              className="flex items-center gap-1.5 px-4.5 py-2 rounded-xl bg-[#8BE3BB] text-[#071410] text-sm font-semibold hover:bg-[#a1ecd0] active:scale-[0.98] transition-all shadow-[0_2px_12px_rgba(139,227,187,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8BE3BB]"
            >
              Launch App <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </Link>
          </div>

          {/* Mobile Right Controls */}
          <div className="flex md:hidden items-center gap-2">
            <Link
              href="/send"
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#8BE3BB] text-[#071410] text-xs font-semibold"
            >
              Launch App
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open mobile menu"
              className="p-2 text-[#91AAA0] hover:text-[#F4F1E8] transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* ─── Mobile Menu Drawer ─────────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative ml-auto w-64 h-full bg-[#10231B] border-l border-[#294438] flex flex-col p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <SwiftChainLogo className="w-4 h-4 text-[#8BE3BB]" />
                <span className="text-sm font-bold text-[#F4F1E8]">SwiftChain</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close mobile menu"
                className="p-1.5 text-[#91AAA0] hover:text-[#F4F1E8] rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex flex-col gap-1.5">
              {navLinks.map((link) => (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => scrollToSection(link.id)}
                  className="text-left px-3 py-2.5 rounded-xl text-sm font-medium text-[#91AAA0] hover:text-[#F4F1E8] hover:bg-[#183126] transition-colors"
                >
                  {link.label}
                </button>
              ))}
            </nav>

            <div className="mt-auto space-y-3 pt-6 border-t border-[#294438]/60">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#071410] border border-[#294438] text-xs text-[#91AAA0]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#6ED6A8]" />
                Sepolia Testnet Prototype
              </div>
              <Link
                href="/send"
                className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl bg-[#8BE3BB] text-[#071410] text-sm font-semibold shadow-md"
              >
                Launch App <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ─── Hero Section (Centered Composition as in Mockup) ───────────── */}
      <section className="relative pt-32 pb-24 sm:pt-40 sm:pb-32 px-6 max-w-6xl mx-auto text-center z-10">
        {/* Eyebrow */} 
        <p className="text-xs sm:text-[13px] font-semibold uppercase tracking-[0.2em] text-[#91AAA0] mb-5">
          BLOCKCHAIN-POWERED REMITTANCE
        </p>

        {/* Centered Display Headline */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-[76px] font-extrabold tracking-[-0.035em] leading-[1.04] text-[#F4F1E8] max-w-6xl mx-auto mb-6">
          Move money across borders, <br className="hidden sm:inline" />
          <span className="text-[#8BE3BB]">the modern way.</span>
        </h1>

        {/* Centered Supporting Copy */}
        <p className="text-base sm:text-lg md:text-xl text-[#91AAA0] leading-relaxed max-w-2xl mx-auto mb-9 font-normal">
          SwiftChain is a remittance prototype that uses stablecoins to explore faster, more transparent, and lower-cost international transfers.
        </p>

        {/* Centered CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-10">
          <Link
            href="/send"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#8BE3BB] text-[#071410] text-sm sm:text-base font-semibold hover:bg-[#a1ecd0] active:scale-[0.98] transition-all shadow-[0_2px_16px_rgba(139,227,187,0.25)]"
          >
            Launch App <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </Link>

          <button
            type="button"
            onClick={() => scrollToSection('how-it-works')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#10231B] border border-[#294438] text-[#F4F1E8] text-sm sm:text-base font-medium hover:border-[#8BE3BB]/50 hover:text-[#8BE3BB] active:scale-[0.98] transition-all"
          >
            See how it works
          </button>
        </div>

        {/* Centered Trust Line with 3 Indicators */}
        <div className="inline-flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5 text-xs sm:text-sm text-[#91AAA0] font-medium pt-2">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#6ED6A8] animate-pulse" />
            Sepolia testnet
          </span>
          <span className="hidden sm:inline text-[#294438]">•</span>
          <span className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#8BE3BB]" />
            Transparent on-chain records
          </span>
          <span className="hidden sm:inline text-[#294438]">•</span>
          <span className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#8BE3BB]" />
            Fiat settlement simulated
          </span>
        </div>
      </section>

      {/* ─── Features Section ("Why SwiftChain?") ────────────────────────── */}
      <section id="features" className="py-24 px-6 scroll-mt-20 border-t border-[#294438]/50">
        <div className="max-w-5xl mx-auto">
          <div className="max-w-2xl mb-16">
            <p className="text-xs uppercase tracking-[0.2em] text-[#91AAA0] font-semibold mb-3">
              A BETTER WAY TO MOVE MONEY
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#F4F1E8] tracking-[-0.03em] leading-tight mb-4">
              Why SwiftChain?
            </h2>
            <p className="text-base text-[#91AAA0] leading-relaxed">
              Traditional international transfers are slow, expensive and opaque. SwiftChain explores
              a simpler alternative using stablecoins and blockchain infrastructure.
            </p>
          </div>

          {/* Clean Editorial 3-Column Layout with Subtle Dividers */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10 border-t border-[#294438]/60 pt-10">
            {features.map((feat) => (
              <div key={feat.num} className="space-y-3">
                <span className="text-xs font-mono font-bold text-[#8BE3BB] tracking-wider">
                  {feat.num}
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-[#F4F1E8] tracking-tight">
                  {feat.title}
                </h3>
                <p className="text-sm text-[#91AAA0] leading-relaxed">
                  {feat.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works Section ────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-6 scroll-mt-20 border-t border-[#294438]/50 bg-[#06110d]/40">
        <div className="max-w-5xl mx-auto">
          <div className="max-w-2xl mb-16">
            <p className="text-xs uppercase tracking-[0.2em] text-[#91AAA0] font-semibold mb-3">
              HOW IT WORKS
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#F4F1E8] tracking-[-0.03em] leading-tight mb-4">
              Send money in a few simple steps.
            </h2>
            <p className="text-base text-[#91AAA0] leading-relaxed">
              From an amount and quote to an on-chain transaction, explore the flow behind SwiftChain.
            </p>
          </div>

          {/* 4 Process Steps in Clean Horizontal Flow */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 border-t border-[#294438]/60 pt-10">
            {steps.map((st) => (
              <div key={st.num} className="space-y-3">
                <span className="text-xs font-mono font-bold text-[#8BE3BB]">
                  {st.num}
                </span>
                <h3 className="text-base font-bold text-[#F4F1E8] tracking-tight">
                  {st.title}
                </h3>
                <p className="text-xs sm:text-sm text-[#91AAA0] leading-relaxed">
                  {st.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Architecture / Technology Section ───────────────────────────── */}
      <section id="tech-stack" className="py-24 px-6 scroll-mt-20 border-t border-[#294438]/50">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-5 space-y-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[#91AAA0] font-semibold">
                ARCHITECTURE
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#F4F1E8] tracking-tight leading-tight">
                Built to explore blockchain-powered payments.
              </h2>
              <p className="text-sm sm:text-base text-[#91AAA0] leading-relaxed">
                SwiftChain is built on modern, production-grade open-source infrastructure. Every layer
                is selected for cryptographic correctness, security, and developer ergonomics.
              </p>
              <div className="pt-2">
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#10231B] border border-[#294438] text-xs font-mono text-[#8BE3BB]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#6ED6A8]" />
                  Sepolia Testnet · Chain ID 11155111
                </span>
              </div>
            </div>

            {/* Clean, Non-Dense Technical Tier Overview */}
            <div className="lg:col-span-7 rounded-2xl bg-[#0b1d16] border border-[#1e342a] p-6 sm:p-7 space-y-4 divide-y divide-[#1e342a]">
              {techStack.map((item) => (
                <div key={item.layer} className="pt-4 first:pt-0 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#8BE3BB] font-mono">
                      {item.layer}
                    </span>
                    <span className="text-xs font-mono text-[#F4F1E8] font-medium">{item.tech}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-[#91AAA0] leading-relaxed pt-0.5">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── FAQs Section ────────────────────────────────────────────────── */}
      <section id="faqs" className="py-24 px-6 scroll-mt-20 border-t border-[#294438]/50 bg-[#06110d]/40">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-5">
              <p className="text-xs uppercase tracking-[0.2em] text-[#91AAA0] font-semibold mb-3">
                FAQS
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#F4F1E8] tracking-tight leading-tight mb-4">
                Questions &amp; answers.
              </h2>
              <p className="text-sm text-[#91AAA0] leading-relaxed">
                Everything you need to know about SwiftChain prototype, testnet tokens, and simulated settlement.
              </p>
            </div>

            <div className="lg:col-span-7 divide-y divide-[#294438]/60">
              {faqs.map((faq) => (
                <FaqAccordionItem key={faq.q} q={faq.q} a={faq.a} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Final CTA Section ───────────────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-[#294438]/50 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#F4F1E8] tracking-tight leading-tight">
            Explore a different approach to global payments.
          </h2>
          <p className="text-base sm:text-lg text-[#91AAA0] leading-relaxed max-w-xl mx-auto">
            Try SwiftChain on Sepolia testnet and explore a more transparent way to move value across borders.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              href="/send"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#8BE3BB] text-[#071410] text-sm sm:text-base font-semibold hover:bg-[#a1ecd0] active:scale-[0.98] transition-all shadow-[0_2px_16px_rgba(139,227,187,0.25)]"
            >
              Launch App <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </Link>

            <a
              href="https://github.com/CherukuriPavanKumar/SwiftChain"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#10231B] border border-[#294438] text-[#F4F1E8] text-sm sm:text-base font-medium hover:border-[#8BE3BB]/50 transition-all"
            >
              View on GitHub <ArrowUpRight className="w-4 h-4" />
            </a>
          </div>

          <p className="text-xs text-[#91AAA0] pt-4">
            Sepolia testnet only. Test tokens have no real-world monetary value. Fiat settlement is simulated.
          </p>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-[#294438]/60 py-10 px-6 bg-[#050e0b]">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <SwiftChainLogo className="w-5 h-5 text-[#8BE3BB]" />
            <div>
              <span className="text-sm font-bold text-[#F4F1E8] tracking-tight">SwiftChain</span>
              <span className="text-[10px] uppercase tracking-wider text-[#91AAA0] font-medium ml-2.5">
                GLOBAL PAYMENTS, REIMAGINED
              </span>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-6" aria-label="Footer navigation">
            <a
              href="https://github.com/CherukuriPavanKumar/SwiftChain"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-[#91AAA0] hover:text-[#F4F1E8] transition-colors"
            >
              GitHub
            </a>
            <a
              href="https://github.com/CherukuriPavanKumar/SwiftChain/issues"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-[#91AAA0] hover:text-[#F4F1E8] transition-colors"
            >
              Issues
            </a>
            <button
              type="button"
              onClick={() => scrollToSection('tech-stack')}
              className="text-xs text-[#91AAA0] hover:text-[#F4F1E8] transition-colors"
            >
              Tech stack
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('faqs')}
              className="text-xs text-[#91AAA0] hover:text-[#F4F1E8] transition-colors"
            >
              FAQs
            </button>
          </nav>
        </div>
      </footer>
    </div>
  );
}
