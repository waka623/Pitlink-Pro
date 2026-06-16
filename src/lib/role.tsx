import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Role = "owner" | "staff" | "parttime";

export const ROLE_LABELS: Record<Role, string> = {
  owner: "オーナー / 店長",
  staff: "ピットスタッフ",
  parttime: "アルバイト",
};

export const ROLE_BADGE: Record<Role, string> = {
  owner: "店長",
  staff: "現場",
  parttime: "バイト",
};

interface RoleCtx {
  role: Role | null;
  setRole: (r: Role | null) => void;
}

const Ctx = createContext<RoleCtx>({ role: null, setRole: () => {} });

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("pitlink-role");
      if (saved === "owner" || saved === "staff" || saved === "parttime") {
        setRole(saved);
      }
    } catch {
      // Ignore storage errors and keep the safe in-memory default.
    }
  }, []);

  const updateRole = (nextRole: Role | null) => {
    setRole(nextRole);

    try {
      if (nextRole) {
        window.localStorage.setItem("pitlink-role", nextRole);
      } else {
        window.localStorage.removeItem("pitlink-role");
      }
    } catch {
      // Ignore storage errors and keep the safe in-memory default.
    }
  };

  return <Ctx.Provider value={{ role, setRole: updateRole }}>{children}</Ctx.Provider>;
}

export const useRole = () => useContext(Ctx);

export const can = {
  viewCustomerPII: (r: Role) => r !== "parttime",
  downloadCSV: (r: Role) => r === "owner",
  managePricing: (r: Role) => r === "owner",
  syncPOS: (r: Role) => r === "owner" || r === "staff",
  sendLINE: (r: Role) => r === "owner" || r === "staff",
  inputTireData: (r: Role) => r !== null,
};
