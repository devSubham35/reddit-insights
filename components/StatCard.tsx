export default function StatCard({ label, value, small }: { label: string; value: string | number; small?: boolean }) {
  return (
    <div className="bg-card rounded-xl p-4 border border-neutral-800/60">
      <div className="text-xs text-neutral-400">{label}</div>
      <div className={`text-white font-semibold ${small ? "text-lg" : "text-2xl"}`}>{value}</div>
    </div>
  );
}
