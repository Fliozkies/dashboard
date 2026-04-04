interface MetricCardProps {
  label: string;
  value: string;
  sub: string;
  delta: string;
  deltaUp: boolean;
  barPct: number;
  barColor: string;
}

export default function MetricCard({ label, value, sub, delta, deltaUp, barPct, barColor }: MetricCardProps) {
  return (
    <div className="bg-[#0a0f1e] border border-[#1a2540] rounded-xl p-5">
      <div
        className="text-[11px] text-[#3d5278] tracking-[2px] uppercase mb-2"
        style={{ fontFamily: "var(--font-space-mono)" }}
      >
        {label}
      </div>
      <div
        className="text-[28px] font-semibold text-[#e8f0ff] leading-none"
        style={{ fontFamily: "var(--font-space-mono)" }}
      >
        {value}
      </div>
      <div className="text-[12px] text-[#3d5278] mt-1">
        {sub}&nbsp;
        <span className={deltaUp ? "text-[#22c55e]" : "text-[#ef4444]"}
          style={{ fontFamily: "var(--font-space-mono)" }}>
          {delta}
        </span>
      </div>
      <div className="bg-[#0f1828] rounded h-[6px] overflow-hidden mt-2.5">
        <div
          className="h-full rounded transition-all duration-1000"
          style={{ width: `${barPct}%`, background: barColor }}
        />
      </div>
    </div>
  );
}
