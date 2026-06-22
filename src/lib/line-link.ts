/** タイヤ館福井文京店 LINE連携（デモ: localStorage + バックエンドAPI） */

import { STORE, hasOfficialLine } from "./store-config";

const STORAGE_KEY = "pitlink-line-links";

export type LineLinkRecord = {
  customerId: string;
  lineUserId: string;
  lineDisplayName: string;
  linkedAt: string;
};

export function getOfficialLineAccount() {
  return {
    configured: hasOfficialLine(),
    accountId: STORE.lineId,
    addFriendUrl: STORE.lineAddUrl,
    shopName: STORE.shopName,
  };
}

function loadAll(): Record<string, LineLinkRecord> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, LineLinkRecord>;
  } catch {
    return {};
  }
}

function saveAll(records: Record<string, LineLinkRecord>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function getLineLink(customerId: string): LineLinkRecord | null {
  return loadAll()[customerId] ?? null;
}

export function listLineLinks(): LineLinkRecord[] {
  return Object.values(loadAll());
}

export function linkCustomerLine(
  customerId: string,
  lineDisplayName: string,
): LineLinkRecord {
  const record: LineLinkRecord = {
    customerId,
    lineUserId: `U_${customerId.toLowerCase().replace(/-/g, "_")}_line`,
    lineDisplayName,
    linkedAt: new Date().toISOString(),
  };
  const all = loadAll();
  all[customerId] = record;
  saveAll(all);
  window.dispatchEvent(new CustomEvent("pitlink:line-links-updated"));
  return record;
}

export function unlinkCustomerLine(customerId: string) {
  const all = loadAll();
  delete all[customerId];
  saveAll(all);
  window.dispatchEvent(new CustomEvent("pitlink:line-links-updated"));
}

export function isLineLinked(customerId: string, fallbackLineId?: string): boolean {
  if (!hasOfficialLine()) return false;
  return Boolean(getLineLink(customerId)?.lineUserId || fallbackLineId);
}

export function resolveLineUserId(customerId: string, fallbackLineId?: string): string | undefined {
  if (!hasOfficialLine()) return undefined;
  return getLineLink(customerId)?.lineUserId ?? fallbackLineId;
}
