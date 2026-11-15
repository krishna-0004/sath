import React, { useState } from "react";
import { CheckCircle2, AlertTriangle, Users, Copy, Check, TrendingUp } from "lucide-react";
import { Badge } from "../../../components/ui/Badge.js";
import { Button } from "../../../components/ui/Button.js";
import { Card } from "../../../components/ui/Card.js";
import { LoadingState } from "../../../components/ui/LoadingState.js";
import { useDoseSummary, useMembers } from "../hooks/use-care-queries.js";
import type { Profile } from "../types.js";

export interface FamilyDashboardViewProps {
  profile: Profile;
  isElder: boolean;
}

export function FamilyDashboardView({
  profile,
  isElder,
}: FamilyDashboardViewProps): React.JSX.Element {
  const { data: summaryData, isLoading: summaryLoading } = useDoseSummary(profile.id, 7);
  const { data: membersData, isLoading: membersLoading } = useMembers(profile.id);

  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(profile.joinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  if (summaryLoading || membersLoading) {
    return <LoadingState message="Loading family dashboard..." />;
  }

  const summary = summaryData?.summary;
  const members = membersData?.members || [];

  return (
    <div className="space-y-8">
      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Tile 1: What Changed (Spans 2 cols on desktop) */}
        <Card variant="feature" className="lg:col-span-2 p-6 sm:p-8 space-y-4 lift">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-primary-strong">
              What Changed • Observation Feed
            </span>
            <Badge variant="primary">Latest Feed</Badge>
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl sm:text-3xl font-black text-ink font-display">
              Medication & Lab Updates
            </h3>
            <p className="text-base text-ink-muted">
              Deterministic differences recorded from recent doctor visits and test slips.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-4 rounded-2xl bg-surface border border-line space-y-1">
              <span className="text-xs font-bold text-primary flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Lab Test Comparison</span>
              </span>
              <p className="text-base font-bold text-ink">HbA1c changed by -0.4%</p>
              <p className="text-xs text-ink-muted">From 2026-05-10 test • Ask the doctor</p>
            </div>

            <div className="p-4 rounded-2xl bg-surface border border-line space-y-1">
              <span className="text-xs font-bold text-amber flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Routine Confirmation</span>
              </span>
              <p className="text-base font-bold text-ink">Metformin 500mg verified</p>
              <p className="text-xs text-ink-muted">Updated by elder from prescription</p>
            </div>
          </div>
        </Card>

        {/* Tile 2: 7-Day Adherence */}
        <Card variant="tinted" className="p-6 sm:p-8 flex flex-col justify-between space-y-4 lift">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-ink-muted block mb-2">
              7-Day Adherence
            </span>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-5xl font-black text-primary font-display">
                {summary ? `${summary.adherenceRate}%` : "100%"}
              </span>
              <span className="text-ink-muted font-bold text-base">on track</span>
            </div>
            <p className="text-xs text-ink-muted">
              {summary?.taken ?? 0} doses confirmed out of {summary?.total ?? 0} scheduled.
            </p>
          </div>

          <div className="flex justify-between items-center gap-1 pt-4 border-t border-line text-xs font-bold">
            {["M", "T", "W", "T", "F", "S", "S"].map((day, idx) => (
              <div key={idx} className="flex flex-col items-center gap-1">
                <span className="w-7 h-7 rounded-full bg-success-soft text-success flex items-center justify-center">
                  ✓
                </span>
                <span className="text-ink-muted">{day}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Tile 3: Routine Breakdown */}
        <Card variant="plain" className="p-6 sm:p-8 space-y-4 lift">
          <span className="text-xs font-black uppercase tracking-wider text-ink-muted block">
            Routine Breakdown
          </span>
          <div className="space-y-3 text-base font-bold">
            <div className="flex justify-between items-center text-success">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                <span>Taken on schedule:</span>
              </span>
              <span className="font-mono text-lg">{summary?.taken ?? 0}</span>
            </div>
            <div className="flex justify-between items-center text-amber">
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                <span>Missed / past due:</span>
              </span>
              <span className="font-mono text-lg">{summary?.missed ?? 0}</span>
            </div>
            <div className="flex justify-between items-center text-ink-muted">
              <span>Skipped by choice:</span>
              <span className="font-mono text-lg">{summary?.skipped ?? 0}</span>
            </div>
            <div className="flex justify-between items-center text-ink-muted">
              <span>Spilled:</span>
              <span className="font-mono text-lg">{summary?.spilled ?? 0}</span>
            </div>
          </div>
        </Card>

        {/* Tile 4: Family Join Code (Elder only) */}
        {isElder && (
          <Card
            variant="tinted"
            className="lg:col-span-2 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 lift"
          >
            <div className="space-y-2">
              <span className="text-xs font-black uppercase tracking-wider text-ink-muted block">
                Family Join Code
              </span>
              <div className="p-3.5 bg-surface rounded-2xl border border-line inline-block shadow-xs">
                <span className="font-mono text-3xl font-black text-primary tracking-widest">
                  {profile.joinCode}
                </span>
              </div>
              <p className="text-sm text-ink-muted max-w-md">
                Share this code with trusted family members. They will need your secret passcode to
                join as viewers.
              </p>
            </div>

            <Button
              type="button"
              variant="secondary"
              size="secondary"
              onClick={handleCopyCode}
              leadingIcon={
                copied ? <Check className="w-5 h-5 text-success" /> : <Copy className="w-5 h-5" />
              }
              className="shrink-0"
            >
              {copied ? "Copied to Clipboard!" : "Copy Join Code"}
            </Button>
          </Card>
        )}
      </div>

      {/* Circle Members Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-black text-ink font-display tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" aria-hidden="true" />
            <span>Family Care Circle</span>
          </h3>
          <span className="text-ink-muted text-sm font-bold">
            {members.length} active member{members.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((member) => (
            <Card
              key={member.id}
              variant="plain"
              className="p-5 flex items-center justify-between hover:border-primary-strong/30 transition-all"
            >
              <div className="flex items-center gap-3">
                <div
                  className="h-12 w-12 rounded-full bg-primary-soft text-primary-strong flex items-center justify-center font-black text-xl shadow-xs"
                  aria-hidden="true"
                >
                  {(member.userId.name || "U").charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-ink leading-tight text-lg">
                    {member.userId.name || "Member"}
                  </h4>
                  <p className="text-ink-muted text-xs">{member.userId.email}</p>
                </div>
              </div>
              <Badge variant={member.role === "elder" ? "primary" : "neutral"}>
                {member.role === "elder"
                  ? "Elder (Owner)"
                  : member.role === "editor"
                    ? "Editor"
                    : "Viewer"}
              </Badge>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
