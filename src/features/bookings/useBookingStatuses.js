import { useCallback, useEffect, useMemo, useState } from "react";
import { bookingApi } from "@/features/bookings/api";
import { BOOKING_STATUSES } from "@/shared/constants";

/**
 * Catalog statuses for updating booking lines (admin-managed list).
 * Falls back to built-in defaults if the API is unavailable.
 */
export function useBookingStatusCatalog() {
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await bookingApi.listStatuses();
      setCatalog(Array.isArray(rows) ? rows : []);
    } catch {
      setCatalog(BOOKING_STATUSES.map((name) => ({ _id: name, name })));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const names = useMemo(
    () => catalog.map((r) => r.name).filter(Boolean),
    [catalog]
  );

  /** Options for a select; keeps current value visible even if removed from catalog. */
  const optionsFor = useCallback(
    (current) => {
      if (current && !names.includes(current)) {
        return [current, ...names];
      }
      return names;
    },
    [names]
  );

  return { catalog, names, optionsFor, loading, reload };
}

/** Distinct statuses present on bookings — for list filters. */
export function useBookingStatusesInUse() {
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await bookingApi.listStatusesInUse();
      setStatuses(Array.isArray(rows) ? rows : []);
    } catch {
      setStatuses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { statuses, loading, reload };
}
