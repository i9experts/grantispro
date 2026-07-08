const SYMBOLS: Record<string, string> = {
  USD: "$",
  PKR: "Rs ",
  GBP: "£",
  EUR: "€",
  SAR: "SAR ",
  AED: "AED ",
};

export function formatCurrency(amount: number, currency: string = "USD"): string {
  const symbol = SYMBOLS[currency] ?? `${currency} `;
  return `${symbol}${amount.toLocaleString()}`;
}

export const CURRENCIES = ["USD", "PKR", "GBP", "EUR", "SAR", "AED"];

export const FUND_CATEGORY_VALUES = [
  "ZAKAT",
  "SADAQAH",
  "SADAQAH_JARIYAH",
  "FITRANA",
  "WAQF",
  "QURBANI",
  "GENERAL_DONATION",
  "CORPORATE_CSR",
  "GOVERNMENT_GRANT",
  "OTHER",
] as const;

export const FUND_CATEGORIES: { value: string; label: string; group: string }[] = [
  { value: "ZAKAT", label: "Zakat", group: "Islamic" },
  { value: "SADAQAH", label: "Sadaqah", group: "Islamic" },
  { value: "SADAQAH_JARIYAH", label: "Sadaqah Jariyah (ongoing)", group: "Islamic" },
  { value: "FITRANA", label: "Fitrana (Zakat al-Fitr)", group: "Islamic" },
  { value: "WAQF", label: "Waqf (endowment)", group: "Islamic" },
  { value: "QURBANI", label: "Qurbani", group: "Islamic" },
  { value: "GENERAL_DONATION", label: "General donation", group: "General" },
  { value: "CORPORATE_CSR", label: "Corporate CSR", group: "General" },
  { value: "GOVERNMENT_GRANT", label: "Government grant", group: "General" },
  { value: "OTHER", label: "Other", group: "General" },
];

export function fundCategoryLabel(value: string): string {
  return FUND_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}
