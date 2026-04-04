'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

type Bucket = { label: string; count: number };

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

async function fetchActivity(days: number): Promise<Bucket[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from('commits')
    .select('created_at')
    .gte('created_at', since.toISOString())
    .order('created_at');

  if (error || !data) return Array.from({ length: days }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (days - 1 - i));
    return { label: DAY_LABELS[d.getDay()], count: 0 };
  });

  const buckets: Record<string, { label: string; count: number }> = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(); d.setDate(d.getDate() - (days - 1 - i));
    const key = d.toISOString().slice(0, 10);
    buckets[key] = { label: DAY_LABELS[d.getDay()], count: 0 };
  }
  for (const row of data) {
    const key = (row.created_at as string).slice(0, 10);
    if (key in buckets) buckets[key].count++;
  }
  return Object.values(buckets);
}

export default function CommitChart() {
  const [tab, setTab] = useState<'week' | 'month'>('week');
  const [data, setData] = useState<Bucket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchActivity(tab === 'week' ? 14 : 28).then((d) => {
      setData(d);
      setLoading(false);
    });
  }, [tab]);

  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="bg-[#0a0f1e] border border-[#1a2540] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="text-[14px] font-medium text-[#e8f0ff]">Commit activity</div>
        <div className="flex gap-1">
          {(['week', 'month'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`text-[11px] px-3 py-1 rounded border transition-all cursor-pointer ${
                tab === t
                  ? 'bg-[#0d1a30] text-[#4a9eff] border-[#1a3060]'
                  : 'text-[#3d5278] border-[#1a2540] hover:text-[#6b7fa3]'
              }`}
              style={{ fontFamily: 'var(--font-space-mono)' }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-[120px] flex items-center justify-center">
          <span className="text-[11px] text-[#3d5278]" style={{ fontFamily: 'var(--font-space-mono)' }}>
            loading...
          </span>
        </div>
      ) : (
        <>
          <div className="flex items-end gap-1 h-[120px]">
            {data.map((b, i) => {
              const pct = Math.round((b.count / max) * 100);
              const isLast = i === data.length - 1;
              return (
                <div
                  key={i}
                  className="flex-1 rounded-t min-w-0 transition-all duration-150 cursor-pointer hover:opacity-75"
                  style={{
                    height: `${Math.max(pct, 4)}%`,
                    background: isLast ? '#4a9eff' : '#1a3060',
                    boxShadow: isLast ? '0 0 8px #4a9eff44' : 'none',
                  }}
                  title={`${b.count} commits`}
                />
              );
            })}
          </div>
          <div className="flex gap-1 mt-1.5">
            {data.map((b, i) => (
              <div
                key={i}
                className="flex-1 text-center text-[9px] text-[#2d3d5a]"
                style={{ fontFamily: 'var(--font-space-mono)' }}
              >
                {b.label}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
