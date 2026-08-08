import {School} from "lucide-react";
import {schools} from "@/lib/mock";

export default function SchoolsPage(){
  return <div className="space-y-4"><div><h1 className="text-2xl font-bold">Trường & đơn vị</h1><p className="mt-1 text-sm text-[var(--sunbot-muted)]">Một trường có thể có nhiều cơ hội kinh doanh theo thời gian.</p></div><div className="grid gap-3">{schools.map(s=><div key={s.name} className="sb-card p-4"><div className="flex flex-col justify-between gap-3 md:flex-row md:items-center"><div className="flex gap-3"><div className="grid size-11 place-items-center rounded-2xl bg-[#edf4ff] text-[var(--sunbot-blue)]"><School size={21}/></div><div><div className="font-bold">{s.name}</div><div className="mt-1 text-sm text-[var(--sunbot-muted)]">{s.area} · {s.status}</div></div></div><div className="md:text-right"><div className="text-sm font-bold">{s.next}</div><div className="mt-1 text-xs text-[var(--sunbot-muted)]">Hạn {s.due} · Công nợ {s.debt}</div></div></div></div>)}</div></div>;
}
