import type { ReactNode } from "react";
import { SidebarIndustrial } from "@/components/ui/sidebar-industrial";

export default function IndustrialLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-[#F3F4F6]">
      <aside className="w-72 bg-[var(--color-brand-bg)] text-white hidden md:block">
        <SidebarIndustrial />
      </aside>
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
