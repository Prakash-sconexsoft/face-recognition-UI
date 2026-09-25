"use client";

import { ScanFace, UserPlus, Users, Fingerprint, ArrowRight } from "lucide-react";
import Link from "next/link";
import { CardSkeleton } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { PageHeader } from "@/components/ui/PageHeader";
import { usePersons } from "@/hooks/usePersons";
import { formatDateTime } from "@/lib/utils";

export default function DashboardPage() {
  const { persons, loading, error, refresh } = usePersons();

  const totalPersons = persons.length;
  const totalEmbeddings = persons.reduce(
    (sum, person) => sum + (person.embedding_count ?? 0),
    0
  );
  const recentPersons = [...persons]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 5);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of enrolled people and face embeddings."
      />

      {error ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              <>
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
              </>
            ) : (
              <>
                <StatCard
                  icon={Users}
                  label="Total Persons"
                  value={totalPersons}
                  accent="bg-blue-50 text-blue-600"
                />
                <StatCard
                  icon={Fingerprint}
                  label="Total Embeddings"
                  value={totalEmbeddings}
                  accent="bg-violet-50 text-violet-600"
                />
                <StatCard
                  icon={ScanFace}
                  label="Avg. Embeddings / Person"
                  value={
                    totalPersons > 0
                      ? Math.round((totalEmbeddings / totalPersons) * 10) / 10
                      : 0
                  }
                  accent="bg-emerald-50 text-emerald-600"
                />
              </>
            )}
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <h2 className="mb-3 text-sm font-semibold text-slate-900">
                Quick Actions
              </h2>
              <div className="space-y-3">
                <QuickAction
                  href="/people/enroll"
                  icon={UserPlus}
                  title="Enroll Person"
                  description="Register a new person and capture face images."
                />
                <QuickAction
                  href="/recognize"
                  icon={ScanFace}
                  title="Take Attendance"
                  description="Identify enrolled people using the camera."
                />
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="flex items-center justify-between">
                <h2 className="mb-3 text-sm font-semibold text-slate-900">
                  Recently Enrolled
                </h2>
                <Link
                  href="/people"
                  className="mb-3 flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  View all
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {loading ? (
                  <div className="p-6 text-sm text-slate-400">Loading...</div>
                ) : recentPersons.length === 0 ? (
                  <div className="p-6 text-sm text-slate-500">
                    No people enrolled yet. Get started by enrolling your
                    first person.
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {recentPersons.map((person) => (
                      <li key={person.id}>
                        <Link
                          href={`/people/${person.id}`}
                          className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-900">
                              {person.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {person.person_code}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-4">
                            <span className="text-xs text-slate-500">
                              {person.embedding_count} embeddings
                            </span>
                            <span className="hidden text-xs text-slate-400 sm:inline">
                              {formatDateTime(person.created_at)}
                            </span>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${accent}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-3 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: typeof UserPlus;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50/50"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-900">{title}</p>
        <p className="mt-0.5 text-sm text-slate-500">{description}</p>
      </div>
    </Link>
  );
}
