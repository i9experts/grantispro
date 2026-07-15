"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";

export default function TagListManager({
  title,
  description,
  endpoint,
  itemsKey,
}: {
  title: string;
  description: string;
  endpoint: string; // e.g. "/api/campuses"
  itemsKey: string; // e.g. "campuses"
}) {
  const [items, setItems] = useState<{ id: string; name: string }[]>([]);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch(endpoint);
    if (res.ok) {
      const data = await res.json();
      setItems(data[itemsKey] ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd() {
    if (!newName.trim()) return;
    setAdding(true);
    setError("");
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    setAdding(false);
    if (res.ok) {
      setNewName("");
      load();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Couldn't add that.");
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`${endpoint}/${id}`, { method: "DELETE" });
    if (res.ok) {
      setItems((it) => it.filter((i) => i.id !== id));
    } else {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Couldn't delete that.");
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-card border border-plum/5 p-6">
      <p className="text-sm font-medium text-plum">{title}</p>
      <p className="text-xs text-plum/50 mt-0.5 mb-3">{description}</p>

      {loading ? (
        <p className="text-sm text-plum/40">Loading…</p>
      ) : (
        <div className="flex flex-wrap gap-2 mb-3">
          {items.length === 0 && <p className="text-sm text-plum/40">None added yet.</p>}
          {items.map((item) => (
            <span
              key={item.id}
              className="inline-flex items-center gap-1.5 text-sm bg-plum/5 text-plum rounded-full px-3 py-1"
            >
              {item.name}
              <button onClick={() => handleDelete(item.id)} aria-label={`Remove ${item.name}`}>
                <X size={13} className="text-plum/40 hover:text-red-600" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          className="flex-1 rounded-lg border border-plum/20 px-3 py-1.5 text-sm"
          placeholder="Add new…"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAdd())}
        />
        <button
          onClick={handleAdd}
          disabled={adding}
          className="text-sm bg-plum/5 text-plum rounded-lg px-3 flex items-center gap-1 disabled:opacity-50"
        >
          <Plus size={14} strokeWidth={2} />
          Add
        </button>
      </div>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}
