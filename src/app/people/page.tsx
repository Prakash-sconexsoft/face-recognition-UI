"use client";

import { RefreshCw, Search, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PersonTable } from "@/components/people/PersonTable";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { TableSkeleton } from "@/components/ui/LoadingState";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { usePersons } from "@/hooks/usePersons";
import { deletePerson } from "@/lib/api/persons";
import { getErrorMessage } from "@/lib/utils";
import type { Person } from "@/types";

export default function PeoplePage() {
  const { persons, loading, error, refresh, setPersons } = usePersons();
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Person | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filteredPersons = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return persons;
    return persons.filter(
      (person) =>
        person.name.toLowerCase().includes(query) ||
        person.person_code.toLowerCase().includes(query)
    );
  }, [persons, search]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deletePerson(deleteTarget.id);
      setPersons((current) => current.filter((p) => p.id !== deleteTarget.id));
      showToast({
        variant: "success",
        title: "Person deleted",
        description: `${deleteTarget.name} has been removed.`,
      });
      setDeleteTarget(null);
    } catch (err) {
      showToast({
        variant: "error",
        title: "Failed to delete person",
        description: getErrorMessage(err, "Please try again."),
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="People"
        description="Manage enrolled people and their face embeddings."
        actions={
          <Link
            href="/people/enroll"
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            <UserPlus className="h-4 w-4" />
            Enroll Person
          </Link>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name or person code..."
            className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="inline-flex items-center gap-1.5 self-start rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60 sm:self-auto"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <TableSkeleton />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : filteredPersons.length === 0 ? (
        persons.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No people enrolled yet"
            description="Enroll your first person to start building the face recognition database."
            action={
              <Link
                href="/people/enroll"
                className="mt-1 inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <UserPlus className="h-4 w-4" />
                Enroll Person
              </Link>
            }
          />
        ) : (
          <EmptyState
            icon={Search}
            title="No matches found"
            description={`No people match "${search}". Try a different search term.`}
          />
        )
      ) : (
        <PersonTable persons={filteredPersons} onDelete={setDeleteTarget} />
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete this person?"
        description={`This will permanently remove ${deleteTarget?.name ?? "this person"} and all of their enrolled face data.`}
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
