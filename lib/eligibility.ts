// The eligibility engine — evaluates a program's CriteriaBlocks against an
// applicant's submitted answers, using whichever logic type the program's
// admin configured (ALL / ANY / weighted SCORE). This is the runtime
// counterpart to the criteria builder: what gets defined there gets
// evaluated here, with no hardcoded rules for any institution.

type FieldType = "NUMBER" | "TEXT" | "BOOLEAN" | "SELECT";

export type CriteriaBlockLike = {
  id: string;
  label: string;
  fieldType: FieldType;
  operator: string;
  value: string;
  weight: number;
};

export type CriteriaResult = {
  criteriaId: string;
  label: string;
  matched: boolean;
  weight: number;
};

export type EligibilityResult = {
  qualifies: boolean;
  score: number;
  maxScore: number;
  results: CriteriaResult[];
};

function compare(fieldType: FieldType, operator: string, answer: string, threshold: string): boolean {
  if (answer === undefined || answer === null || answer === "") return false;

  if (fieldType === "NUMBER") {
    const a = Number(answer);
    const t = Number(threshold);
    if (Number.isNaN(a) || Number.isNaN(t)) return false;
    switch (operator) {
      case "lt": return a < t;
      case "lte": return a <= t;
      case "gt": return a > t;
      case "gte": return a >= t;
      case "eq": return a === t;
      default: return false;
    }
  }

  if (fieldType === "BOOLEAN") {
    const a = String(answer).toLowerCase() === "true";
    const t = String(threshold).toLowerCase() === "true";
    return a === t;
  }

  if (fieldType === "SELECT") {
    const a = answer.trim().toLowerCase();
    if (operator === "in") {
      return threshold
        .split(",")
        .map((v) => v.trim().toLowerCase())
        .includes(a);
    }
    return a === threshold.trim().toLowerCase();
  }

  // TEXT
  const a = answer.trim().toLowerCase();
  const t = threshold.trim().toLowerCase();
  if (operator === "contains") return a.includes(t);
  return a === t;
}

export function evaluateEligibility(
  logicType: "ALL" | "ANY" | "SCORE",
  scoreThreshold: number | null | undefined,
  criteriaBlocks: CriteriaBlockLike[],
  answers: Record<string, string>
): EligibilityResult {
  const results: CriteriaResult[] = criteriaBlocks.map((c) => ({
    criteriaId: c.id,
    label: c.label,
    matched: compare(c.fieldType, c.operator, answers[c.id], c.value),
    weight: c.weight,
  }));

  const maxScore = criteriaBlocks.reduce((sum, c) => sum + c.weight, 0);
  const score = results.filter((r) => r.matched).reduce((sum, r) => sum + r.weight, 0);

  let qualifies: boolean;
  if (logicType === "ALL") {
    qualifies = results.length > 0 && results.every((r) => r.matched);
  } else if (logicType === "ANY") {
    qualifies = results.some((r) => r.matched);
  } else {
    qualifies = score >= (scoreThreshold ?? 0);
  }

  return { qualifies, score, maxScore, results };
}
