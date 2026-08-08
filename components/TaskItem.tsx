import {CalendarDays,ChevronRight} from "lucide-react";

export function TaskItem({school,title,due,urgent,ceo}:{school:string;title:string;due:string;urgent?:boolean;ceo?:boolean}){
  return <div className="flex items-center gap-3 border-b border-[var(--sunbot-border)] py-3 last:border-0">
    <div className={`h-11 w-1 rounded-full ${urgent?"bg-[var(--sunbot-danger)]":ceo?"bg-[var(--sunbot-warning)]":"bg-[var(--sunbot-blue)]"}`}/>
    <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><div className="font-bold">{school}</div>{ceo&&<span className="sb-chip !bg-[#fff7e8] !text-[var(--sunbot-warning)]">Cần CEO</span>}</div><div className="mt-0.5 text-sm text-[var(--sunbot-muted)]">{title}</div><div className="mt-1 flex items-center gap-1 text-xs text-[var(--sunbot-muted)]"><CalendarDays size={13}/>{due}</div></div>
    <ChevronRight className="text-[var(--sunbot-muted)]" size={18}/>
  </div>;
}
