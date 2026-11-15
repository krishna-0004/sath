import React from "react";
import { Badge } from "../components/ui/Badge.js";
import { Button } from "../components/ui/Button.js";
import { Card } from "../components/ui/Card.js";
import { SkipLink } from "../components/ui/SkipLink.js";

/**
 * Saath Landing Page presenting the elder-care product vision and key guarantees.
 */
export function LandingPage(): React.JSX.Element {
  return (
    <div className="min-h-screen flex flex-col bg-stone-50 text-stone-900">
      <SkipLink targetId="main" />

      {/* Header Landmark */}
      <header className="border-b border-stone-200 bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-xl bg-teal-700 flex items-center justify-center text-white font-bold text-xl select-none"
              aria-hidden="true"
            >
              S
            </div>
            <span className="text-2xl font-bold tracking-tight text-teal-900">Saath</span>
          </div>
          <Badge variant="primary">Elder-First Care</Badge>
        </div>
      </header>

      {/* Main Landmark */}
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        <section className="max-w-5xl mx-auto px-6 py-16 sm:py-24 text-center">
          <div className="inline-block mb-6">
            <Badge variant="accent">Phase 0 Foundation</Badge>
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold text-stone-950 tracking-tight leading-tight mb-8">
            Every prescription, every report, every emergency.{" "}
            <span className="text-teal-800 block mt-2">One family thread the elder controls.</span>
          </h1>
          <p className="text-xl sm:text-2xl text-stone-700 max-w-3xl mx-auto mb-12 leading-relaxed">
            Saath keeps your health history, medication schedules, and loved ones coordinated in a
            single, calm space where the elder always retains full control and consent.
          </p>

          {/* Placeholders for upcoming Phase 1 authentication */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto mb-16">
            <div className="w-full relative group">
              <Button
                variant="primary"
                size="primary"
                className="w-full opacity-60 cursor-not-allowed"
                aria-disabled="true"
                title="Coming next in Phase 1"
              >
                Sign in with Google
              </Button>
              <span className="block mt-2 text-sm text-stone-500 font-medium">
                Coming next in Phase 1
              </span>
            </div>

            <div className="w-full relative group">
              <Button
                variant="secondary"
                size="primary"
                className="w-full opacity-60 cursor-not-allowed"
                aria-disabled="true"
                title="Coming next in Phase 1"
              >
                Try demo
              </Button>
              <span className="block mt-2 text-sm text-stone-500 font-medium">
                Coming next in Phase 1
              </span>
            </div>
          </div>

          {/* Principles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <Card>
              <h2 className="text-xl font-bold text-stone-900 mb-3">Elder-In-Control</h2>
              <p className="text-stone-600 text-base leading-relaxed">
                Nothing is modified or dispatched without explicit elder confirmation. You decide
                who sees your reports.
              </p>
            </Card>

            <Card>
              <h2 className="text-xl font-bold text-stone-900 mb-3">No Medical Diagnosis</h2>
              <p className="text-stone-600 text-base leading-relaxed">
                We transcribe and summarize what your documents say with zero speculative medical
                claims. Always ask your doctor.
              </p>
            </Card>

            <Card>
              <h2 className="text-xl font-bold text-stone-900 mb-3">Accessible by Design</h2>
              <p className="text-stone-600 text-base leading-relaxed">
                Large 76px touch targets, high-contrast typography, and gentle colors designed for
                effortless reading.
              </p>
            </Card>
          </div>
        </section>
      </main>

      {/* Footer Landmark */}
      <footer className="border-t border-stone-200 bg-white py-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-stone-500 text-base">
          <p>© {new Date().getFullYear()} Saath. Built with care for elders and families.</p>
        </div>
      </footer>
    </div>
  );
}
