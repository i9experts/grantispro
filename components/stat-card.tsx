export default function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "dark";
}) {
  if (tone === "dark") {
    return (
      <div className="bg-plum-deep rounded-2xl p-5">
        <p className="text-xs text-white/50 mb-1">{label}</p>
        <p className="text-2xl font-display font-semibold text-ivory">{value}</p>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-2xl p-5 shadow-card border border-plum/5">
      <p className="text-xs text-plum/50 mb-1">{label}</p>
      <p className="text-2xl font-display font-semibold text-plum">{value}</p>
    </div>
  );
}
