"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ActiveToggle({ programId, isActive }: { programId: string; isActive: boolean }) {
  const router = useRouter();
  const [updating, setUpdating] = useState(false);

  async function handleClick() {
    const next = !isActive;
    const message = next
      ? "Reactivate this program? Its public application and donor invite links will work again."
      : "Set this program to Inactive? Its public application link and donor invite link will both stop working immediately — no one will be able to apply or pledge until you reactivate it.";
    if (!window.confirm(message)) return;

    setUpdating(true);
    const res = await fetch(`/api/programs/${programId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: next }),
    });
    setUpdating(false);
    if (res.ok) router.refresh();
  }

  return (
    <button
      onClick={handleClick}
      disabled={updating}
      className={`text-xs px-2.5 py-1 rounded-full font-medium transition disabled:opacity-50 ${
        isActive ? "bg-emerald/10 text-emerald-dark hover:bg-emerald/20" : "bg-plum/5 text-plum/40 hover:bg-plum/10"
      }`}
      title={isActive ? "Click to set Inactive" : "Click to reactivate"}
    >
      {updating ? "…" : isActive ? "Active" : "Inactive"}
    </button>
  );
}
