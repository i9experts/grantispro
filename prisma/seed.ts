import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Shared, seedable preset library — general scholarship award practice
// from school through university level. Every tenant sees the same list;
// selecting one pre-fills a CriteriaBlock that the admin can still edit.
const presets: {
  category: string;
  label: string;
  fieldType: "NUMBER" | "TEXT" | "BOOLEAN" | "SELECT";
  operator: string;
  defaultValue: string;
  defaultWeight: number;
  suggestedDocumentLabel?: string;
}[] = [
  // Academic merit
  { category: "Academic merit", label: "GPA or percentage above threshold", fieldType: "NUMBER", operator: "gte", defaultValue: "3.5", defaultWeight: 5, suggestedDocumentLabel: "Latest academic transcript" },
  { category: "Academic merit", label: "Class rank in top percentage", fieldType: "NUMBER", operator: "lte", defaultValue: "10", defaultWeight: 4, suggestedDocumentLabel: "Class rank certificate" },
  { category: "Academic merit", label: "Standardized test score above threshold", fieldType: "NUMBER", operator: "gte", defaultValue: "1200", defaultWeight: 4, suggestedDocumentLabel: "Standardized test score report" },

  // Financial need
  { category: "Financial need", label: "Household income below threshold", fieldType: "NUMBER", operator: "lt", defaultValue: "50000", defaultWeight: 5, suggestedDocumentLabel: "Income certificate" },
  { category: "Financial need", label: "Family receives government assistance", fieldType: "BOOLEAN", operator: "eq", defaultValue: "true", defaultWeight: 3, suggestedDocumentLabel: "Government assistance verification letter" },
  { category: "Financial need", label: "Unmet financial aid gap", fieldType: "NUMBER", operator: "gte", defaultValue: "5000", defaultWeight: 4, suggestedDocumentLabel: "Financial aid award letter" },

  // Demographic and social category
  { category: "Demographic and social category", label: "Orphan or single-parent household", fieldType: "BOOLEAN", operator: "eq", defaultValue: "true", defaultWeight: 5, suggestedDocumentLabel: "Guardian death or single-parent certificate" },
  { category: "Demographic and social category", label: "First-generation student", fieldType: "BOOLEAN", operator: "eq", defaultValue: "true", defaultWeight: 3 },
  { category: "Demographic and social category", label: "Person with disability", fieldType: "BOOLEAN", operator: "eq", defaultValue: "true", defaultWeight: 3, suggestedDocumentLabel: "Disability certification" },
  { category: "Demographic and social category", label: "Refugee or displaced status", fieldType: "BOOLEAN", operator: "eq", defaultValue: "true", defaultWeight: 4, suggestedDocumentLabel: "Refugee or displacement registration" },

  // Institutional relationship
  { category: "Institutional relationship", label: "Sibling already enrolled", fieldType: "BOOLEAN", operator: "eq", defaultValue: "true", defaultWeight: 2 },
  { category: "Institutional relationship", label: "Staff or employee child", fieldType: "BOOLEAN", operator: "eq", defaultValue: "true", defaultWeight: 2 },
  { category: "Institutional relationship", label: "Continuing student renewal GPA", fieldType: "NUMBER", operator: "gte", defaultValue: "3.0", defaultWeight: 3, suggestedDocumentLabel: "Latest academic transcript" },

  // Talent and service
  { category: "Talent and service", label: "Community service hours completed", fieldType: "NUMBER", operator: "gte", defaultValue: "20", defaultWeight: 2, suggestedDocumentLabel: "Community service verification" },
  { category: "Talent and service", label: "Sports or arts achievement", fieldType: "BOOLEAN", operator: "eq", defaultValue: "true", defaultWeight: 3, suggestedDocumentLabel: "Achievement certificate or award letter" },

  // Geographic
  { category: "Geographic", label: "Resident within catchment area", fieldType: "SELECT", operator: "eq", defaultValue: "Local district", defaultWeight: 2, suggestedDocumentLabel: "Proof of residence" },
];

async function main() {
  console.log(`Seeding ${presets.length} preset criteria...`);

  for (let i = 0; i < presets.length; i++) {
    const p = presets[i];
    const existing = await prisma.presetCriteria.findFirst({
      where: { category: p.category, label: p.label },
    });
    if (existing) {
      await prisma.presetCriteria.update({
        where: { id: existing.id },
        data: { ...p, sortOrder: i },
      });
    } else {
      await prisma.presetCriteria.create({
        data: { ...p, sortOrder: i },
      });
    }
  }

  console.log("Preset criteria seeded.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
