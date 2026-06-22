import { useCallback, useEffect, useState } from "react";
import { customers as baseCustomers, type Customer } from "@/lib/mock-data";
import { getLineLink } from "@/lib/line-link";

function mergeLineLinks(list: typeof baseCustomers): Customer[] {
  if (typeof window === "undefined") return list;
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
  const [customers, setCustomers] = useState<Customer[]>(baseCustomers);

  useEffect(() => {
    const refresh = () => setCustomers(mergeLineLinks(baseCustomers));
    refresh();
    window.addEventListener("pitlink:line-links-updated", refresh);
    return () => window.removeEventListener("pitlink:line-links-updated", refresh);
  }, []);

  return customers;
}

export function useCustomerById(id: string | null): Customer | null {
  const list = useCustomers();
  if (!id) return null;
  return list.find((c) => c.id === id) ?? null;
}

export function useLineLinkRefresh(): () => void {
  return useCallback(() => {
    window.dispatchEvent(new CustomEvent("pitlink:line-links-updated"));
  }, []);
}
