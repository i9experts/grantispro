"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type FieldType = "NUMBER" | "TEXT" | "BOOLEAN" | "SELECT";

type CriteriaRow = {
  clientId: string;
  label: string;
  fieldType: FieldType;
  operator: string;
  value: string;
  weight: number;
  requiredDocumentLabel: string;
};

type Preset = {
  id: string;
  category: string;
  label: string;
  fieldType: FieldType;
  operator: string;
  defaultValue: string;
  defaultWeight: number;
  suggestedDocumentLabel: string | null;
};

const OPS_BY_TYPE: Record<FieldType, [string, string][]> = {
  NUMBER: [
    ["lt", "is less than"],
    ["lte", "is at most"],
    ["gt", "is greater than"],
    ["gte", "is at least"],
    ["eq", "equals"],
  ],
  TEXT: [
    ["eq", "equals"],
    ["contains", "contains"],
  ],
  BOOLEAN: [["eq", "is"]],
  SELECT: [
    ["eq", "equals"],
    ["in", "is one of"],
  ],
};

function newClientId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function CriteriaBuilderPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [programName, setProgramName] = useState("");
  const [logicType, setLogicType] = useState("ALL");
  const [criteria, setCriteria] = useState<CriteriaRow[]>([]);
  const [presetGroups, setPresetGroups] = useState<Record<string, Preset[]>>({});
  const [showPresets, setShowPresets] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const [programRes, presetsRes] = await Promise.all([
        fetch(`/api/programs/${params.id}`),
        fetch("/api/presets"),
      ]);

      if (programRes.ok) {
        const { program } = await programRes.json();
        setProgramName(program.name);
        setLogicType(program.logicType);
        setCriteria(
          program.criteriaBlocks.map((c: any) => ({
            clientId: newClientId(),
            label: c.label,
            fieldType: c.fieldType,
            operator: c.operator,
            value: c.value,
            weight: c.weight,
            requiredDocumentLabel: c.requiredDocumentLabel ?? "",
          }))
        );
      }

      if (presetsRes.ok) {
        const { groups } = await presetsRes.json();
        setPresetGroups(groups);
      }

      setLoading(false);
    }
    load();
  }, [params.id]);

  function addBlank() {
    setCriteria((c) => [
      ...c,
      {
        clientId: newClientId(),
        label: "New criteria",
        fieldType: "NUMBER",
        operator: "lt",
        value: "0",
        weight: 1,
        requiredDocumentLabel: "",
      },
    ]);
  }

  function addFromPreset(p: Preset) {
    setCriteria((c) => [
      ...c,
      {
        clientId: newClientId(),
        label: p.label,
        fieldType: p.fieldType,
        operator: p.operator,
        value: p.defaultValue,
        weight: p.defaultWeight,
        requiredDocumentLabel: p.suggestedDocumentLabel ?? "",
      },
    ]);
  }

  function updateRow(clientId: string, patch: Partial<CriteriaRow>) {
    setCriteria((c) =>
      c.map((row) => (row.clientId === clientId ? { ...row, ...patch } : row))
    );
  }

  function removeRow(clientId: string) {
    setCriteria((c) => c.filter((row) => row.clientId !== clientId));
  }

  function opLabel(type: FieldType, op: string) {
    const found = OPS_BY_TYPE[type].find(([v]) => v === op);
    return found ? found[1] : op;
  }

  function previewText() {
    if (criteria.length === 0) return "Add at least one criteria block, or start from a preset.";
    const lines = criteria.map((c) => `${c.label} ${opLabel(c.fieldType, c.operator)} ${c.value}`);
    const word = logicType === "ALL" ? "all" : logicType === "ANY" ? "any" : "all (weighted)";
    return `An applicant qualifies if ${word} of the following are true: ` + lines.join("; ") + ".";
  }

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/programs/${params.id}/criteria`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        criteria: criteria.map((c) => ({
          label: c.label,
          fieldType: c.fieldType,
          operator: c.operator,
          value: c.value,
          weight: c.weight,
          requiredDocumentLabel: c.requiredDocumentLabel || null,
        })),
      }),
    });
    setSaving(false);
    if (res.ok) router.push("/dashboard/programs");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-ivory px-8 py-10">
        <p className="text-plum/60">Loading…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-ivory px-8 py-10">
      <header>
        <h1 className="text-2xl font-bold text-plum">
          Grantis<span className="text-marigold-dark">pro</span>
        </h1>
      </header>

      <section className="mt-10 max-w-3xl">
        <h2 className="text-lg font-semibold text-plum">{programName}</h2>
        <p className="text-sm text-plum/60 mt-1">Step 2 of 2 &middot; Define eligibility criteria</p>

        <div className="flex gap-3 mt-6">
          <button
            onClick={() => setShowPresets((s) => !s)}
            className="border border-plum/20 rounded-lg px-4 py-2 text-sm font-medium text-plum hover:bg-plum/5"
          >
            Use preset criteria
          </button>
          <button
            onClick={addBlank}
            className="border border-plum/20 rounded-lg px-4 py-2 text-sm font-medium text-plum hover:bg-plum/5"
          >
            Add blank criteria
          </button>
        </div>

        {showPresets && (
          <div className="mt-4 bg-white/60 border border-plum/10 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-plum/60">Common criteria, grouped by scholarship practice</p>
              <button onClick={() => setShowPresets(false)} className="text-plum/40 hover:text-plum">
                ✕
              </button>
            </div>
            {Object.entries(presetGroups).map(([category, items]) => (
              <div key={category} className="mb-4">
                <p className="text-xs font-medium text-plum mb-2">{category}</p>
                <div className="flex flex-wrap gap-2">
                  {items.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => addFromPreset(p)}
                      className="text-xs px-3 py-1.5 rounded-full border border-plum/20 text-plum hover:bg-emerald/10 hover:border-emerald"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3">
          {criteria.length === 0 && (
            <p className="text-sm text-plum/50 py-4">No criteria yet. Use a preset or add one blank.</p>
          )}
          {criteria.map((c) => (
            <div key={c.clientId} className="bg-white/60 border border-plum/10 rounded-xl p-4">
              <div className="grid grid-cols-12 gap-3 items-end">
                <div className="col-span-4">
                  <label className="block text-xs text-plum/60 mb-1">Label</label>
                  <input
                    className="w-full rounded-lg border border-plum/20 px-2.5 py-1.5 text-sm"
                    value={c.label}
                    onChange={(e) => updateRow(c.clientId, { label: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-plum/60 mb-1">Field type</label>
                  <select
                    className="w-full rounded-lg border border-plum/20 px-2 py-1.5 text-sm"
                    value={c.fieldType}
                    onChange={(e) => {
                      const ft = e.target.value as FieldType;
                      updateRow(c.clientId, { fieldType: ft, operator: OPS_BY_TYPE[ft][0][0] });
                    }}
                  >
                    <option value="NUMBER">Number</option>
                    <option value="TEXT">Text</option>
                    <option value="BOOLEAN">Yes / no</option>
                    <option value="SELECT">Select</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-plum/60 mb-1">Operator</label>
                  <select
                    className="w-full rounded-lg border border-plum/20 px-2 py-1.5 text-sm"
                    value={c.operator}
                    onChange={(e) => updateRow(c.clientId, { operator: e.target.value })}
                  >
                    {OPS_BY_TYPE[c.fieldType].map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-plum/60 mb-1">Value</label>
                  <input
                    className="w-full rounded-lg border border-plum/20 px-2.5 py-1.5 text-sm"
                    value={c.value}
                    onChange={(e) => updateRow(c.clientId, { value: e.target.value })}
                  />
                </div>
                {logicType === "SCORE" && (
                  <div className="col-span-1">
                    <label className="block text-xs text-plum/60 mb-1">Weight</label>
                    <input
                      type="number"
                      className="w-full rounded-lg border border-plum/20 px-2 py-1.5 text-sm"
                      value={c.weight}
                      onChange={(e) => updateRow(c.clientId, { weight: Number(e.target.value) })}
                    />
                  </div>
                )}
                <div className="col-span-1 flex justify-end">
                  <button
                    onClick={() => removeRow(c.clientId)}
                    className="text-plum/40 hover:text-red-600 px-2 py-1.5"
                    aria-label="Remove criteria"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="mt-2">
                <label className="block text-xs text-plum/60 mb-1">
                  Requires supporting document (optional)
                </label>
                <input
                  className="w-full rounded-lg border border-plum/20 px-2.5 py-1.5 text-sm"
                  placeholder="e.g. Income certificate"
                  value={c.requiredDocumentLabel}
                  onChange={(e) => updateRow(c.clientId, { requiredDocumentLabel: e.target.value })}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 bg-plum/5 rounded-xl p-4">
          <p className="text-xs text-plum/60 mb-1">Eligibility preview</p>
          <p className="text-sm text-plum">{previewText()}</p>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-plum text-ivory rounded-lg px-6 py-2.5 font-medium hover:bg-plum-deep transition disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save program"}
          </button>
        </div>
      </section>
    </main>
  );
}
