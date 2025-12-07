import type { ReactNode } from "react";
import { SidebarHospitality } from "@/components/ui/sidebar-hospitality";

export default function HospitalityLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-[#F3F4F6]">
      <aside className="w-72 bg-gradient-to-b from-rose-950 to-rose-900 text-white hidden md:block">
        <SidebarHospitality />
      </aside>
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
