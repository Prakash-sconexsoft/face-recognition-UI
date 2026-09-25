"use client";

import { ChevronLeft, Fingerprint, Hash, ScanFace, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { EmbeddingCard } from "@/components/people/EmbeddingCard";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import {
  deleteEmbedding,
  deletePerson,
  getPersonEmbeddings,
  getPersons,
} from "@/lib/api/persons";
import { formatDateTime, getErrorMessage } from "@/lib/utils";
import type { Embedding, Person } from "@/types";

export default function PersonDetailsPage() {
  const params = useParams<{ personId: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const personId = Number(params.personId);

  const [person, setPerson] = useState<Person | null>(null);
  const [embeddings, setEmbeddings] = useState<Embedding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [embeddingToDelete, setEmbeddingToDelete] = useState<Embedding | null>(
    null
  );
  const [deletingEmbedding, setDeletingEmbedding] = useState(false);
  const [confirmDeletePerson, setConfirmDeletePerson] = useState(false);
  const [deletingPerson, setDeletingPerson] = useState(false);

  const invalidId = Number.isNaN(personId);

  // No single-person endpoint exists on the backend, so the person's
  // summary is derived from the full list returned by GET /api/persons.
  const applyLoadResult = useCallback(
    (persons: Person[], personEmbeddings: Embedding[]) => {
      const found = persons.find((p) => p.id === personId) ?? null;
      if (!found) {
        setError("Person not found.");
      } else {
        setPerson(found);
        setError(null);
      }
      setEmbeddings(personEmbeddings);
    },
    [personId]
  );

  // Exposed for manual retry from the error state, triggered by a click.
  const load = useCallback(async () => {
    try {
      const [persons, personEmbeddings] = await Promise.all([
        getPersons(),
        getPersonEmbeddings(personId),
      ]);
      applyLoadResult(persons, personEmbeddings);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load person details."));
    } finally {
      setLoading(false);
    }
  }, [personId, applyLoadResult]);

  // Initial load on mount, kept as an inline promise chain so state updates
  // happen inside .then/.catch callbacks rather than synchronously in the
  // effect body.
  useEffect(() => {
    if (invalidId) return;
    Promise.all([getPersons(), getPersonEmbeddings(personId)])
      .then(([persons, personEmbeddings]) => {
        applyLoadResult(persons, personEmbeddings);
      })
      .catch((err: unknown) => {
        setError(getErrorMessage(err, "Failed to load person details."));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [invalidId, personId, applyLoadResult]);

  const handleDeleteEmbedding = async () => {
    if (!embeddingToDelete) return;
    setDeletingEmbedding(true);
    try {
      await deleteEmbedding(embeddingToDelete.id);
      setEmbeddings((current) =>
        current.filter((e) => e.id !== embeddingToDelete.id)
      );
      setPerson((current) =>
        current
          ? { ...current, embedding_count: Math.max(0, current.embedding_count - 1) }
          : current
      );
      showToast({
        variant: "success",
        title: "Face embedding deleted",
      });
      setEmbeddingToDelete(null);
    } catch (err) {
      showToast({
        variant: "error",
        title: "Failed to delete embedding",
        description: getErrorMessage(err, "Please try again."),
      });
    } finally {
      setDeletingEmbedding(false);
    }
  };

  const handleDeletePerson = async () => {
    if (!person) return;
    setDeletingPerson(true);
    try {
      await deletePerson(person.id);
      showToast({
        variant: "success",
        title: "Person deleted",
        description: `${person.name} has been removed.`,
      });
      router.push("/people");
    } catch (err) {
      showToast({
        variant: "error",
        title: "Failed to delete person",
        description: getErrorMessage(err, "Please try again."),
      });
      setDeletingPerson(false);
    }
  };

  if (invalidId) {
    return (
      <ErrorState title="Could not load this person" message="Invalid person id." />
    );
  }

  if (loading) {
    return <LoadingState label="Loading person details..." />;
  }

  if (error || !person) {
    return (
      <ErrorState
        title="Could not load this person"
        message={error ?? "Person not found."}
        onRetry={load}
      />
    );
  }

  return (
    <div>
      <PageHeader
        breadcrumb={
          <Link
            href="/people"
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
          >
            <ChevronLeft className="h-4 w-4" />
            People
          </Link>
        }
        title={person.name}
        description={`Enrolled ${formatDateTime(person.created_at)}`}
        actions={
          <button
            type="button"
            onClick={() => setConfirmDeletePerson(true)}
            className="inline-flex items-center gap-2 rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            Delete Person
          </button>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <InfoCard icon={Hash} label="Person Code" value={person.person_code} />
        <InfoCard
          icon={Fingerprint}
          label="Embeddings"
          value={String(person.embedding_count)}
        />
        <InfoCard
          icon={ScanFace}
          label="Created At"
          value={formatDateTime(person.created_at)}
        />
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">
          Enrolled Faces
        </h2>
      </div>

      {embeddings.length === 0 ? (
        <EmptyState
          icon={ScanFace}
          title="No face embeddings"
          description="This person has no enrolled face images yet."
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {embeddings.map((embedding) => (
            <EmbeddingCard
              key={embedding.id}
              embedding={embedding}
              onDelete={setEmbeddingToDelete}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={embeddingToDelete !== null}
        title="Delete this enrolled face?"
        description="This face embedding will be permanently removed from the person's profile."
        confirmLabel="Delete"
        loading={deletingEmbedding}
        onConfirm={handleDeleteEmbedding}
        onCancel={() => setEmbeddingToDelete(null)}
      />

      <ConfirmDialog
        open={confirmDeletePerson}
        title="Delete this person?"
        description={`${person.name} and all of their enrolled face data will be permanently removed. This cannot be undone.`}
        confirmLabel="Delete Person"
        loading={deletingPerson}
        onConfirm={handleDeletePerson}
        onCancel={() => setConfirmDeletePerson(false)}
      />
    </div>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Hash;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-slate-400">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="mt-1.5 truncate text-sm font-semibold text-slate-900">
        {value}
      </p>
    </div>
  );
}
