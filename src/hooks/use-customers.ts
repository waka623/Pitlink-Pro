import { useCallback, useEffect, useMemo, useState } from "react";
import { customers as baseCustomers, type Customer } from "@/lib/mock-data";
import { getLineLink } from "@/lib/line-link";

function mergeLineLinks(list: typeof baseCustomers): Customer[] {
  return list.map((c) => {
    const link = getLineLink(c.id);
    if (!link) return c;
    return {
      ...c,
      lineId: link.lineUserId,
      lineDisplayName: link.lineDisplayName,
      lineLinkedAt: link.linkedAt,
    };
  });
}

export function useCustomers(): Customer[] {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const refresh = () => setVersion((v) => v + 1);
    window.addEventListener("pitlink:line-links-updated", refresh);
    return () => window.removeEventListener("pitlink:line-links-updated", refresh);
  }, []);

  return useMemo(() => mergeLineLinks(baseCustomers), [version]);
}

export function useCustomerById(id: string | null): Customer | null {
  const list = useCustomers();
  return useMemo(() => list.find((c) => c.id === id) ?? null, [list, id]);
}

export function useLineLinkRefresh(): () => void {
  const [, setVersion] = useState(0);
  return useCallback(() => setVersion((v) => v + 1), []);
}
