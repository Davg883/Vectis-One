import type { ReactNode } from "react";
import { SidebarLegal } from "@/components/ui/sidebar-legal";

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-[#F3F4F6]">
      <aside className="w-72 bg-gradient-to-b from-indigo-950 to-indigo-900 text-white hidden md:block">
        <SidebarLegal />
      </aside>
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
