import React from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card } from "../components/ui/Card.js";
import { LoadingState } from "../components/ui/LoadingState.js";
import { careApi } from "../features/care/api.js";
import type { EmergencySummary } from "../features/care/types.js";

export function EmergencyPage(): React.JSX.Element {
  const { token } = useParams<{ token: string }>();

  const { data, isLoading, error } = useQuery<EmergencySummary>({
    queryKey: ["emergency-share", token],
    queryFn: () => careApi.getEmergencyShare(token || ""),
    enabled: Boolean(token),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 p-6">
        <LoadingState message="Loading emergency medical record..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 p-6">
        <Card className="max-w-md w-full p-8 text-center space-y-4">
          <span className="text-5xl" aria-hidden="true">
            ⚠️
          </span>
          <h1 className="text-2xl font-black text-slate-900">Emergency Link Expired</h1>
          <p className="text-base text-slate-600">
            This emergency information link has expired or is invalid. Emergency links are active
            for 24 hours from dispatch.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 text-slate-900 p-4 md:p-8">
      <main className="max-w-4xl mx-auto space-y-6">
        {/* Urgent Header */}
        <div className="p-6 md:p-8 rounded-3xl bg-red-700 text-white shadow-xl space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-4xl" aria-hidden="true">
              🚨
            </span>
            <div>
              <span className="text-sm font-bold uppercase tracking-wider text-red-200">
                First Responder & Doctor Emergency Profile
              </span>
              <h1 className="text-3xl md:text-4xl font-black">{data.elderName}</h1>
            </div>
          </div>

          {data.emergencyPhone && (
            <div className="pt-2">
              <a
                href={`tel:${data.emergencyPhone}`}
                className="inline-flex items-center justify-center gap-3 px-8 py-4 min-h-[76px] rounded-2xl bg-white text-red-800 font-extrabold text-2xl hover:bg-red-50 focus:outline-none focus:ring-4 focus:ring-red-300 shadow-md transition-all active:scale-[0.98]"
              >
                <span>📞 Call Emergency Contact: {data.emergencyPhone}</span>
              </a>
            </div>
          )}
        </div>

        {/* Doctor Contacts */}
        {data.doctorContacts.length > 0 && (
          <Card className="p-6 space-y-4 border-2 border-slate-300">
            <h2 className="text-2xl font-bold text-slate-900">
              Registered Doctors & Consented Contacts
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.doctorContacts.map((doc, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                >
                  <div>
                    <p className="text-lg font-bold text-slate-900">{doc.name}</p>
                    <p className="text-sm text-slate-500 capitalize">
                      {doc.kind.replace("_", " ")}
                    </p>
                  </div>
                  <a
                    href={`tel:${doc.whatsappNumber}`}
                    className="px-4 py-2 min-h-[48px] rounded-xl bg-slate-900 text-white font-bold text-sm flex items-center gap-2"
                  >
                    <span>Call</span>
                  </a>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Active Medications (Vital for Emergency Rooms) */}
        <Card className="p-6 space-y-4 border-2 border-slate-300">
          <h2 className="text-2xl font-bold text-slate-900">
            Active Medications ({data.medicines.length})
          </h2>
          <div className="divide-y divide-slate-200">
            {data.medicines.map((med, idx) => (
              <div key={idx} className="py-4 first:pt-0 last:pb-0 space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black text-slate-900">{med.name}</h3>
                  <span className="font-mono text-sm px-3 py-1 rounded-full bg-slate-200 text-slate-800 font-bold">
                    {med.strengthText}
                  </span>
                </div>
                <p className="text-base text-slate-700">
                  Frequency: {med.frequencyText} {med.withFood ? `(${med.withFood} food)` : ""}
                </p>
                {med.instructions && (
                  <p className="text-sm text-slate-500 italic">Notes: {med.instructions}</p>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Lab Metrics */}
        {data.recentReports.length > 0 && (
          <Card className="p-6 space-y-4 border-2 border-slate-300">
            <h2 className="text-2xl font-bold text-slate-900">Recent Lab Biomarkers</h2>
            <div className="space-y-4">
              {data.recentReports.map((rep, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2"
                >
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-900">{rep.title}</h3>
                    <span className="text-sm text-slate-500">
                      {new Date(rep.testDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
                    {rep.metrics.map((m, mIdx) => (
                      <div key={mIdx} className="bg-white p-2 rounded-xl border border-slate-200">
                        <span className="block text-xs font-semibold text-slate-500">{m.name}</span>
                        <span className="text-base font-bold text-slate-900">
                          {m.value} {m.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <div className="text-center text-sm text-slate-500 p-4">
          Saath Elder Care Platform • Secure Emergency Share Token Active
        </div>
      </main>
    </div>
  );
}
