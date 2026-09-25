"use client";

import { Eye, Fingerprint, Trash2 } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import type { Person } from "@/types";

export function PersonTable({
  persons,
  onDelete,
}: {
  persons: Person[];
  onDelete: (person: Person) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <th className="px-6 py-3 font-medium">Person Code</th>
              <th className="px-6 py-3 font-medium">Name</th>
              <th className="px-6 py-3 font-medium">Embeddings</th>
              <th className="px-6 py-3 font-medium">Created At</th>
              <th className="px-6 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {persons.map((person) => (
              <tr key={person.id} className="hover:bg-slate-50">
                <td className="px-6 py-3.5 font-mono text-xs text-slate-600">
                  {person.person_code}
                </td>
                <td className="px-6 py-3.5 font-medium text-slate-900">
                  {person.name}
                </td>
                <td className="px-6 py-3.5 text-slate-600">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                    <Fingerprint className="h-3 w-3" />
                    {person.embedding_count}
                  </span>
                </td>
                <td className="px-6 py-3.5 text-slate-500">
                  {formatDate(person.created_at)}
                </td>
                <td className="px-6 py-3.5">
                  <div className="flex justify-end gap-2">
                    <Link
                      href={`/people/${person.id}`}
                      className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </Link>
                    <button
                      type="button"
                      onClick={() => onDelete(person)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="divide-y divide-slate-100 md:hidden">
        {persons.map((person) => (
          <li key={person.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">
                  {person.name}
                </p>
                <p className="mt-0.5 font-mono text-xs text-slate-500">
                  {person.person_code}
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                <Fingerprint className="h-3 w-3" />
                {person.embedding_count}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Created {formatDate(person.created_at)}
            </p>
            <div className="mt-3 flex gap-2">
              <Link
                href={`/people/${person.id}`}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                <Eye className="h-3.5 w-3.5" />
                View
              </Link>
              <button
                type="button"
                onClick={() => onDelete(person)}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
