"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export default function DeleteButton({
  endpoint,
  confirmMessage,
  label = "",
  redirectTo,
}: {
  endpoint: string;
  confirmMessage: string;
  label?: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(confirmMessage)) return;

    setDeleting(true);
    setError("");
    const res = await fetch(endpoint, { method: "DELETE" });
    setDeleting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Couldn't delete this — it may be in use elsewhere.");
      return;
    }

    if (redirectTo) router.push(redirectTo);
    else router.refresh();
  }

  return (
    <div className="inline-flex flex-col items-end">
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="flex items-center gap-1 text-sm text-red-600/70 hover:text-red-600 disabled:opacity-50"
        title="Delete"
      >
        <Trash2 size={15} strokeWidth={1.75} />
        {label}
      </button>
      {error && <p className="text-xs text-red-600 mt-1 max-w-[220px] text-right">{error}</p>}
    </div>
  );
}
