import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Camera,
  CheckCircle2,
  Users,
  FileText,
  AlertTriangle,
  ShieldCheck,
  ArrowRight,
  Heart,
} from "lucide-react";
import { Badge } from "../components/ui/Badge.js";
import { Button } from "../components/ui/Button.js";
import { Card } from "../components/ui/Card.js";
import { SkipLink } from "../components/ui/SkipLink.js";
import { HeroBlob } from "../components/illustrations/HeroBlob.js";

export function LandingPage(): React.JSX.Element {
  const statsRef = useRef<HTMLDivElement>(null);
  const [_statsVisible, setStatsVisible] = useState(false);

  useEffect(() => {
    const el = statsRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setStatsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setStatsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-ink selection:bg-primary-soft selection:text-primary-strong">
      <SkipLink targetId="main" />

      {/* Header Landmark */}
      <header className="border-b border-line bg-surface/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="h-11 w-11 rounded-2xl bg-primary flex items-center justify-center text-white font-black text-2xl select-none shadow-xs"
              aria-hidden="true"
            >
              S
            </div>
            <span className="text-2xl font-black tracking-tight text-ink font-display">Saath</span>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="primary">Elder-First Care</Badge>
            <Link
              to="/login"
              className="px-5 py-2.5 text-base font-bold text-primary hover:text-primary-strong rounded-full transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>

      {/* Main Landmark */}
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden hero-glow border-b border-line py-16 lg:py-24">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Vision & CTAs */}
            <div className="lg:col-span-7 space-y-8 text-left">
              <div className="inline-block">
                <Badge variant="accent">Family Care Thread</Badge>
              </div>

              <h1 className="text-4xl sm:text-6xl font-black text-ink tracking-tight leading-[1.1] font-display">
                Every prescription, every report, every emergency.{" "}
                <span className="text-primary block mt-2">
                  One family thread the elder controls.
                </span>
              </h1>

              <p className="text-xl sm:text-2xl text-ink-muted max-w-2xl leading-relaxed">
                Saath keeps medications, lab trends, and family emergency contacts coordinated in
                one calm space where the elder always stays in control.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 max-w-lg">
                <Link to="/login" className="flex-1">
                  <Button variant="primary" size="primary" className="w-full shadow-md">
                    Continue with Google
                  </Button>
                </Link>

                <Link to="/login" className="flex-1">
                  <Button variant="secondary" size="primary" className="w-full">
                    Try the demo
                  </Button>
                </Link>
              </div>

              <p className="text-sm font-semibold text-ink-muted flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" aria-hidden="true" />
                <span>We only see your name and email. Saath never diagnoses.</span>
              </p>
            </div>

            {/* Right Column: Phone Mock Illustration */}
            <div className="lg:col-span-5 relative flex justify-center items-center">
              <div className="absolute w-[440px] h-[440px] -z-10 pointer-events-none opacity-80">
                <HeroBlob />
              </div>

              <div
                className="w-full max-w-[340px] bg-surface rounded-[36px] border-4 border-line shadow-2xl p-5 space-y-4 lift"
                aria-hidden="true"
              >
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary-soft text-primary-strong flex items-center justify-center font-bold text-xs">
                      D
                    </div>
                    <div>
                      <span className="text-sm font-bold text-ink block">Dad&apos;s Routine</span>
                      <span className="text-[10px] text-ink-muted">Today • Morning</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-success bg-success-soft px-2.5 py-0.5 rounded-full">
                    Recorded ✓
                  </span>
                </div>

                {/* Dose Card Preview */}
                <div className="p-3.5 rounded-2xl bg-surface-2 border border-line space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-base font-bold text-ink">Metformin</h4>
                      <p className="text-xs text-ink-muted">500mg • Breakfast • With food</p>
                    </div>
                    <span className="text-xs font-bold text-success">8:30 AM</span>
                  </div>
                  <div className="w-full py-2 bg-success text-white text-xs font-bold rounded-xl text-center">
                    Recorded ✓
                  </div>
                </div>

                {/* What Changed Snippet */}
                <div className="p-3 rounded-2xl bg-primary-soft/50 border border-primary/20 text-xs text-ink">
                  <span className="font-bold block text-primary-strong">Observation:</span>
                  <span>HbA1c changed by -0.4% from May test.</span>
                </div>

                {/* SOS Pill Preview */}
                <div className="pt-1">
                  <div className="w-full py-2.5 bg-danger text-white text-xs font-black rounded-full text-center flex items-center justify-center gap-1.5 shadow-sm">
                    <span>🚨</span>
                    <span>EMERGENCY SOS READY</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS SECTION */}
        <section className="py-20 max-w-7xl mx-auto px-6 space-y-12 text-center">
          <div className="space-y-3">
            <h2 className="text-3xl sm:text-5xl font-black text-ink font-display">
              How Saath Works
            </h2>
            <p className="text-lg text-ink-muted max-w-xl mx-auto">
              Three simple, elder-guided steps to coordinated family peace of mind.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <Card variant="tinted" className="space-y-4 lift">
              <div className="w-14 h-14 rounded-2xl bg-primary-soft text-primary-strong flex items-center justify-center font-black text-2xl">
                1
              </div>
              <h3 className="text-2xl font-bold text-ink flex items-center gap-2">
                <Camera className="w-6 h-6 text-primary" aria-hidden="true" />
                <span>Snap Document</span>
              </h3>
              <p className="text-base text-ink-muted leading-relaxed">
                Take a quick photo of any paper prescription, doctor slip, or laboratory report.
              </p>
            </Card>

            <Card variant="tinted" className="space-y-4 lift">
              <div className="w-14 h-14 rounded-2xl bg-amber-soft text-ink flex items-center justify-center font-black text-2xl">
                2
              </div>
              <h3 className="text-2xl font-bold text-ink flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-amber" aria-hidden="true" />
                <span>You Confirm</span>
              </h3>
              <p className="text-base text-ink-muted leading-relaxed">
                Nothing is saved automatically. You check every line, dosage, and timing before
                approving.
              </p>
            </Card>

            <Card variant="tinted" className="space-y-4 lift">
              <div className="w-14 h-14 rounded-2xl bg-success-soft text-success flex items-center justify-center font-black text-2xl">
                3
              </div>
              <h3 className="text-2xl font-bold text-ink flex items-center gap-2">
                <Users className="w-6 h-6 text-success" aria-hidden="true" />
                <span>Family Informed</span>
              </h3>
              <p className="text-base text-ink-muted leading-relaxed">
                Family members receive updates in plain words, and only for the categories you
                explicitly share.
              </p>
            </Card>
          </div>
        </section>

        {/* FEATURE TRIO */}
        <section className="py-16 bg-surface-2 border-y border-line">
          <div className="max-w-7xl mx-auto px-6 space-y-12">
            <div className="text-center space-y-3">
              <h2 className="text-3xl sm:text-5xl font-black text-ink font-display">
                Built Around Care & Consent
              </h2>
              <p className="text-lg text-ink-muted max-w-xl mx-auto">
                Essential capabilities designed specifically for older adults and their families.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card variant="feature" className="space-y-4 lift">
                <div className="w-12 h-12 rounded-xl bg-info-soft text-info flex items-center justify-center">
                  <FileText className="w-6 h-6" aria-hidden="true" />
                </div>
                <h3 className="text-2xl font-bold text-ink">Report Lens</h3>
                <p className="text-base text-ink-muted leading-relaxed">
                  Clear biomarker transcription without confusing jargon or alarmist colors. Track
                  changes from past tests deterministically.
                </p>
              </Card>

              <Card variant="feature" className="space-y-4 lift">
                <div className="w-12 h-12 rounded-xl bg-danger-soft text-danger flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6" aria-hidden="true" />
                </div>
                <h3 className="text-2xl font-bold text-ink">Emergency SOS</h3>
                <p className="text-base text-ink-muted leading-relaxed">
                  One-tap emergency dispatch instantly alerts consented doctors and family with a
                  secure 24-hour medical record link.
                </p>
              </Card>

              <Card variant="feature" className="space-y-4 lift">
                <div className="w-12 h-12 rounded-xl bg-primary-soft text-primary-strong flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6" aria-hidden="true" />
                </div>
                <h3 className="text-2xl font-bold text-ink">Family Circle Control</h3>
                <p className="text-base text-ink-muted leading-relaxed">
                  The elder stays the owner. Toggle category permissions for medicines, reports, and
                  appointments whenever you choose.
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* RESEARCH EVIDENCE STRIP */}
        <section ref={statsRef} className="py-20 max-w-7xl mx-auto px-6 space-y-12">
          <div className="text-center space-y-3">
            <Badge variant="accent">Evidence-Based Need</Badge>
            <h2 className="text-3xl sm:text-5xl font-black text-ink font-display">
              Why We Built Saath
            </h2>
            <p className="text-lg text-ink-muted max-w-2xl mx-auto">
              Groundbreaking studies highlight the growing urgency for accessible, elder-led care
              tools.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card variant="plain" className="space-y-2">
              <span className="text-3xl sm:text-4xl font-black text-primary font-display block">
                104M → 319M
              </span>
              <p className="text-base font-bold text-ink">
                India&apos;s population aged 60+, now to 2050
              </p>
              <p className="text-xs text-ink-muted">
                UNFPA India Ageing Report 2023, NITI Aayog 2024
              </p>
            </Card>

            <Card variant="plain" className="space-y-2">
              <span className="text-3xl sm:text-4xl font-black text-amber font-display block">
                41%
              </span>
              <p className="text-base font-bold text-ink">
                Low medication adherence among older adults with chronic illness
              </p>
              <p className="text-xs text-ink-muted">Gujarat community study (2026)</p>
            </Card>

            <Card variant="plain" className="space-y-2">
              <span className="text-3xl sm:text-4xl font-black text-info font-display block">
                12.7 steps • 55.3%
              </span>
              <p className="text-base font-bold text-ink">
                Products average 12.7 setup steps; seniors finish unassisted only 55.3% of the time
              </p>
              <p className="text-xs text-ink-muted">JMIR (2020)</p>
            </Card>

            <Card variant="plain" className="space-y-2">
              <span className="text-3xl sm:text-4xl font-black text-danger font-display block">
                64%
              </span>
              <p className="text-base font-bold text-ink">
                Family caregivers reported significant burden
              </p>
              <p className="text-xs text-ink-muted">Kerala study (2026)</p>
            </Card>
          </div>
        </section>

        {/* THREE CORE PROMISES */}
        <section className="py-16 bg-surface-2 border-t border-line text-center">
          <div className="max-w-4xl mx-auto px-6 space-y-10">
            <h2 className="text-3xl sm:text-4xl font-black text-ink font-display">
              Our Core Promises
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              <div className="p-6 rounded-2xl bg-surface border border-line space-y-2">
                <span className="text-2xl" aria-hidden="true">
                  ✍️
                </span>
                <h3 className="text-xl font-bold text-ink">You confirm everything</h3>
                <p className="text-sm text-ink-muted">
                  No automated changes. The elder reviews and approves every single entry.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-surface border border-line space-y-2">
                <span className="text-2xl" aria-hidden="true">
                  🩺
                </span>
                <h3 className="text-xl font-bold text-ink">We never diagnose</h3>
                <p className="text-sm text-ink-muted">
                  Saath provides verbatim transcriptions and neutral comparisons. Always ask your
                  doctor.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-surface border border-line space-y-2">
                <span className="text-2xl" aria-hidden="true">
                  🔒
                </span>
                <h3 className="text-xl font-bold text-ink">You decide who sees what</h3>
                <p className="text-sm text-ink-muted">
                  Granular sharing toggles for medicines, reports, and appointments.
                </p>
              </div>
            </div>

            <div className="pt-4 flex justify-center">
              <Link to="/login">
                <Button
                  variant="primary"
                  size="primary"
                  trailingIcon={<ArrowRight className="w-5 h-5" />}
                >
                  Get Started with Saath
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer Landmark */}
      <footer className="border-t border-line bg-surface py-12">
        <div className="max-w-7xl mx-auto px-6 space-y-6 text-center text-ink-muted text-sm">
          <p className="max-w-2xl mx-auto text-ink">
            <strong>Medical Notice:</strong> Saath does not replace emergency services or medical
            advice. Always consult a licensed healthcare professional for clinical decisions.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-6 text-ink">
            <a
              href="https://github.com/krishna-0004/sath"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary font-bold underline"
            >
              GitHub Repository
            </a>
            <Link to="/login" className="hover:text-primary font-bold">
              Sign In
            </Link>
          </div>

          <p className="flex items-center justify-center gap-1.5 text-xs">
            <span>Built with</span>
            <Heart className="w-3.5 h-3.5 text-danger fill-current" aria-hidden="true" />
            <span>for elders and families everywhere.</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
