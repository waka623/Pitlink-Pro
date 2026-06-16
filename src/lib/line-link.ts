/** タイヤ館福井 公式LINE連携（デモ: localStorage + バックエンドAPI） */

const STORAGE_KEY = "pitlink-line-links";
const OFFICIAL_ACCOUNT_ID = "@taiyakan_fukui";
const OFFICIAL_ADD_URL = "https://line.me/R/ti/p/@taiyakan_fukui";

export type LineLinkRecord = {
  customerId: string;
  lineUserId: string;
  lineDisplayName: string;
  linkedAt: string;
};

export function getOfficialLineAccount() {
  return {
    accountId: OFFICIAL_ACCOUNT_ID,
    addFriendUrl: OFFICIAL_ADD_URL,
    shopName: "タイヤ館福井",
  };
}

function loadAll(): Record<string, LineLinkRecord> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, LineLinkRecord>;
  } catch {
    return {};
  }
}

function saveAll(records: Record<string, LineLinkRecord>) {
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
  return Boolean(getLineLink(customerId)?.lineUserId || fallbackLineId);
}

export function resolveLineUserId(customerId: string, fallbackLineId?: string): string | undefined {
  return getLineLink(customerId)?.lineUserId ?? fallbackLineId;
}
