"use client";

import { UserButton } from "@clerk/nextjs";
import { Boxes, LayoutDashboard, Plus, Workflow } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWorkflowStore } from "@/store/workflow-store";

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const createWorkflow = useWorkflowStore((state) => state.createWorkflow);

  return (
    <div className="flex min-h-screen bg-[#f6f7f8] text-[#17171a]">
      <aside className="flex w-[76px] flex-col items-center border-r border-[#e7e7eb] bg-white/90 py-4">
        <div className="mb-8 flex size-10 items-center justify-center rounded-xl bg-[#17171a] text-white">
          <Boxes size={20} />
        </div>
        <nav className="flex flex-1 flex-col items-center gap-3">
          <Link
            href="/dashboard"
            className="flex size-11 items-center justify-center rounded-xl text-[#686a72] transition hover:bg-[#f1f1f4] hover:text-[#17171a]"
            title="Dashboard"
          >
            <LayoutDashboard size={20} />
          </Link>
          <button
            className="flex size-11 items-center justify-center rounded-xl text-[#686a72] transition hover:bg-[#f1f1f4] hover:text-[#17171a]"
            title="New workflow"
            onClick={async () => {
              const id = await createWorkflow();
              router.push(`/workflow/${id}`);
            }}
          >
            <Plus size={20} />
          </button>
          <div className="flex size-11 items-center justify-center rounded-xl bg-[#f1efff] text-[#6d5df6]">
            <Workflow size={20} />
          </div>
        </nav>
        <UserButton />
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
