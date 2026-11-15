import React, { useState } from "react";
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
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Adherence Card */}
        <Card className="bg-white border-2 border-stone-200 p-6 rounded-3xl shadow-xs">
          <span className="text-stone-500 font-bold text-sm uppercase tracking-wider block mb-2">
            7-Day Adherence
          </span>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-5xl font-black text-teal-900">
              {summary ? `${summary.adherenceRate}%` : "—"}
            </span>
            <span className="text-stone-500 font-semibold text-base">on schedule</span>
          </div>
          <p className="text-stone-600 text-sm">
            {summary?.taken ?? 0} doses confirmed taken out of {summary?.total ?? 0} scheduled.
          </p>
        </Card>

        {/* Routine Stats Card */}
        <Card className="bg-white border-2 border-stone-200 p-6 rounded-3xl shadow-xs">
          <span className="text-stone-500 font-bold text-sm uppercase tracking-wider block mb-2">
            Routine Breakdown
          </span>
          <div className="space-y-2 text-sm font-semibold">
            <div className="flex justify-between text-teal-800">
              <span>Taken on time:</span>
              <span>{summary?.taken ?? 0}</span>
            </div>
            <div className="flex justify-between text-amber-800">
              <span>Missed / past due:</span>
              <span>{summary?.missed ?? 0}</span>
            </div>
            <div className="flex justify-between text-stone-600">
              <span>Skipped by choice:</span>
              <span>{summary?.skipped ?? 0}</span>
            </div>
            <div className="flex justify-between text-stone-600">
              <span>Spilled:</span>
              <span>{summary?.spilled ?? 0}</span>
            </div>
          </div>
        </Card>

        {/* Join Code Card (Elder only) */}
        {isElder && (
          <Card className="bg-white border-2 border-stone-200 p-6 rounded-3xl shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-stone-500 font-bold text-sm uppercase tracking-wider block mb-2">
                Family Join Code
              </span>
              <div className="p-3 bg-stone-100 rounded-2xl border border-stone-200 mb-2">
                <span className="font-mono text-2xl font-black text-teal-950 tracking-wider">
                  {profile.joinCode}
                </span>
              </div>
              <p className="text-stone-500 text-xs">
                Share with trusted family members. They will need the secret passcode to join.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={handleCopyCode}
              className="w-full mt-4"
            >
              {copied ? "✓ Copied to Clipboard!" : "Copy Join Code"}
            </Button>
          </Card>
        )}
      </div>

      {/* Circle Members Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-bold text-stone-900 tracking-tight">Family Care Circle</h3>
          <span className="text-stone-500 text-sm font-semibold">
            {members.length} active member{members.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((member) => (
            <Card
              key={member.id}
              className="p-5 bg-white border border-stone-200 rounded-2xl flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div
                  className="h-10 w-10 rounded-full bg-teal-100 text-teal-900 flex items-center justify-center font-bold text-lg"
                  aria-hidden="true"
                >
                  {(member.userId.name || "U").charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-stone-900 leading-tight">
                    {member.userId.name || "Member"}
                  </h4>
                  <p className="text-stone-500 text-xs">{member.userId.email}</p>
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
