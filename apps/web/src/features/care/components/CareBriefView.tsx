import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "../../../components/ui/Card.js";
import { careApi } from "../api.js";
import type { Profile } from "../types.js";

export interface CareBriefViewProps {
  profile: Profile;
}

export function CareBriefView({ profile }: CareBriefViewProps): React.JSX.Element {
  const { data: medsData } = useQuery({
    queryKey: ["medicines", profile.id],
    queryFn: () => careApi.getMedicines(profile.id),
  });

  const { data: dosesData } = useQuery({
    queryKey: ["doses-today", profile.id],
    queryFn: () => careApi.getTodayDoses(profile.id),
  });

  const { data: adherenceData } = useQuery({
    queryKey: ["adherence-summary", profile.id],
    queryFn: () => careApi.getDoseSummary(profile.id, 14),
  });

  const { data: reportsData } = useQuery({
    queryKey: ["reports", profile.id],
    queryFn: () => careApi.getReports(profile.id),
  });

  const { data: appointmentsData } = useQuery({
    queryKey: ["appointments", profile.id],
    queryFn: () => careApi.getAppointments(profile.id),
  });

  const { data: doctorContactsData } = useQuery({
    queryKey: ["doctor-contacts", profile.id],
    queryFn: () => careApi.getDoctorContacts(profile.id),
  });

  const medicines = medsData?.medicines.filter((m) => m.status === "active") || [];
  const reports = reportsData?.reports || [];
  const appointments = appointmentsData?.appointments || [];
  const doctors = doctorContactsData?.contacts || [];
  const adherence = adherenceData?.summary;

  const handlePrint = (): void => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Action Bar (hidden in print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Doctor Care Brief
          </h2>
          <p className="text-lg text-slate-600 mt-1">
            One-page medical summary formatted for physician review and appointments.
          </p>
        </div>

        <button
          type="button"
          onClick={handlePrint}
          className="flex items-center justify-center gap-3 px-8 py-4 min-h-[76px] rounded-2xl bg-emerald-700 text-white font-bold text-xl hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-300 shadow-md transition-all active:scale-[0.98]"
        >
          <span className="text-2xl" aria-hidden="true">
            🖨️
          </span>
          <span>Print / Save PDF</span>
        </button>
      </div>

      {/* Printable Sheet */}
      <Card className="p-8 space-y-6 bg-white border-2 border-slate-300 print:border-none print:shadow-none print:p-0">
        {/* Header */}
        <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
          <div>
            <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-800 block">
              Saath Care Platform • Clinical Brief
            </span>
            <h3 className="text-3xl font-black text-slate-900 mt-1">{profile.elderName}</h3>
            <p className="text-sm text-slate-500 mt-0.5">
              Generated: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()} •
              Timezone: {profile.timezone}
            </p>
          </div>
          {profile.emergencyPhone && (
            <div className="text-right">
              <span className="text-xs font-bold text-slate-500 block uppercase">
                Emergency Phone
              </span>
              <span className="text-lg font-bold text-slate-900">{profile.emergencyPhone}</span>
            </div>
          )}
        </div>

        {/* 14-day Adherence Summary */}
        <div className="space-y-2">
          <h4 className="text-lg font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-1">
            14-Day Routine Adherence
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs text-slate-500 font-bold block">Adherence Rate</span>
              <span className="text-2xl font-black text-slate-900">
                {adherence ? `${adherence.adherenceRate}%` : "100%"}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs text-slate-500 font-bold block">Doses Taken</span>
              <span className="text-2xl font-black text-emerald-700">
                {adherence ? adherence.taken : dosesData?.doses.length || 0}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs text-slate-500 font-bold block">Doses Missed</span>
              <span className="text-2xl font-black text-slate-700">
                {adherence ? adherence.missed : 0}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs text-slate-500 font-bold block">Spilled / Skipped</span>
              <span className="text-2xl font-black text-slate-700">
                {adherence ? adherence.spilled + adherence.skipped : 0}
              </span>
            </div>
          </div>
        </div>

        {/* Current Medications Table */}
        <div className="space-y-2">
          <h4 className="text-lg font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-1">
            Active Medications ({medicines.length})
          </h4>
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-slate-100 border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3 font-bold text-slate-800">Medication</th>
                  <th className="py-2 px-3 font-bold text-slate-800">Strength</th>
                  <th className="py-2 px-3 font-bold text-slate-800">Frequency</th>
                  <th className="py-2 px-3 font-bold text-slate-800">Timing & Food</th>
                  <th className="py-2 px-3 font-bold text-slate-800">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {medicines.map((m) => (
                  <tr key={m.id}>
                    <td className="py-2 px-3 font-bold text-slate-900">{m.name}</td>
                    <td className="py-2 px-3 font-mono">{m.strengthText}</td>
                    <td className="py-2 px-3">{m.frequencyText}</td>
                    <td className="py-2 px-3">
                      {m.anchors.join(", ")} {m.withFood ? `(${m.withFood} food)` : ""}
                    </td>
                    <td className="py-2 px-3 text-slate-500 italic">{m.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Lab Test Biomarkers */}
        {reports.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-lg font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-1">
              Recent Laboratory Biomarkers
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {reports.slice(0, 2).map((rep) => (
                <div
                  key={rep.id}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1"
                >
                  <div className="flex justify-between text-xs font-bold text-slate-600">
                    <span>{rep.title}</span>
                    <span>{new Date(rep.testDate).toLocaleDateString()}</span>
                  </div>
                  <div className="divide-y divide-slate-200 text-xs">
                    {rep.metrics.slice(0, 4).map((m, idx) => (
                      <div key={idx} className="py-1 flex justify-between">
                        <span className="font-semibold text-slate-800">{m.name}</span>
                        <span className="font-bold">
                          {m.value} {m.unit} {m.flag !== "normal" && `(${m.flag})`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Appointments */}
        {appointments.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-lg font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-1">
              Upcoming Medical Consultations
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {appointments.slice(0, 4).map((a) => (
                <div
                  key={a.id}
                  className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex justify-between"
                >
                  <span className="font-bold text-slate-900">
                    {a.title} ({a.doctorName})
                  </span>
                  <span className="text-slate-600">
                    {new Date(a.startsAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Appointments */}
        {appointments.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-lg font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-1">
              Upcoming Medical Consultations
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {appointments.slice(0, 4).map((a) => (
                <div
                  key={a.id}
                  className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex justify-between"
                >
                  <span className="font-bold text-slate-900">
                    {a.title} ({a.doctorName})
                  </span>
                  <span className="text-slate-600">
                    {new Date(a.startsAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Doctor Contacts & Consents */}
        {doctors.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-lg font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-1">
              Physicians & Emergency Contacts
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {doctors.map((d) => (
                <div
                  key={d.id}
                  className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex justify-between"
                >
                  <span className="font-bold text-slate-900">
                    {d.name} ({d.kind.replace("_", " ")})
                  </span>
                  <span className="font-mono text-slate-600">{d.whatsappNumber}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rule 9 Footer */}
        <div className="pt-4 border-t border-slate-200 text-xs text-slate-500 text-center">
          Saath provides verbatim transcribing and patient routine tracking. Saath does not diagnose
          or give medical guidance.
        </div>
      </Card>
    </div>
  );
}
