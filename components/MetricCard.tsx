export function MetricCard({label,value,note,tone="blue"}:{label:string;value:string|number;note?:string;tone?:"blue"|"red"|"green"|"orange"}){
  const tones={blue:"text-[var(--sunbot-blue)] bg-[#edf4ff]",red:"text-[var(--sunbot-danger)] bg-[#fff1f0]",green:"text-[var(--sunbot-success)] bg-[#edfbf5]",orange:"text-[var(--sunbot-warning)] bg-[#fff7e8]"};
  return <div className="sb-card p-4"><div className="text-sm text-[var(--sunbot-muted)]">{label}</div><div className={`mt-2 inline-flex rounded-xl px-2.5 py-1 text-2xl font-bold ${tones[tone]}`}>{value}</div>{note&&<div className="mt-2 text-xs text-[var(--sunbot-muted)]">{note}</div>}</div>;
}
