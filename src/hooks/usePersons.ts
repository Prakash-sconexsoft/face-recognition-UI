"use client";

import { useCallback, useEffect, useState } from "react";
import { getPersons } from "@/lib/api/persons";
import { getErrorMessage } from "@/lib/utils";
import type { Person } from "@/types";

interface UsePersonsResult {
  persons: Person[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setPersons: React.Dispatch<React.SetStateAction<Person[]>>;
}

export function usePersons(): UsePersonsResult {
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Exposed for manual refresh/retry triggered from event handlers.
  const refresh = useCallback(async () => {
    try {
      const data = await getPersons();
      setPersons(data);
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load people."));
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load on mount. Kept as an inline promise chain (rather than
  // calling `refresh`) so state updates happen inside .then/.catch
  // callbacks instead of synchronously in the effect body.
  useEffect(() => {
    getPersons()
      .then((data) => {
        setPersons(data);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(getErrorMessage(err, "Failed to load people."));
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return { persons, loading, error, refresh, setPersons };
}
