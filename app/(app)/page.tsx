import Link from "next/link";
import {ArrowUpRight,Plus,Sparkles} from "lucide-react";
import {MetricCard} from "@/components/MetricCard";
import {TaskItem} from "@/components/TaskItem";
import {dashboard} from "@/lib/mock";

export default function HomePage(){
  return <div className="space-y-5">
    <section className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
      <div><div className="sb-chip">Tuần 33</div><h1 className="mt-2 text-2xl font-bold">Chào {dashboard.name} 👋</h1><p className="mt-1 text-sm text-[var(--sunbot-muted)]">{dashboard.role}</p></div>
      <Link href="/cap-nhat" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--sunbot-blue)] px-5 py-3 font-bold text-white"><Plus size={18}/> Cập nhật nhanh</Link>
    </section>

    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {dashboard.metrics.map(([label,value,note,tone])=><MetricCard key={label} label={label} value={value} note={note} tone={tone}/>) }
    </section>

    <section className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
      <div className="sb-card p-4 md:p-5">
        <div className="flex items-center justify-between"><div><h2 className="font-bold">Việc cần làm</h2><p className="mt-1 text-xs text-[var(--sunbot-muted)]">Ưu tiên theo hạn và mức độ ảnh hưởng</p></div><Link href="/cong-viec" className="text-sm font-bold text-[var(--sunbot-blue)]">Xem tất cả</Link></div>
        <div className="mt-2">{dashboard.tasks.map((t,i)=><TaskItem key={i} {...t}/>)}</div>
      </div>
      <div className="sb-card p-4 md:p-5">
        <div className="flex items-center gap-2"><Sparkles size={18} className="text-[var(--sunbot-blue)]"/><h2 className="font-bold">Báo cáo tuần đang hình thành</h2></div>
        <div className="mt-4 grid grid-cols-2 gap-3">{[["Trường cập nhật","6"],["Tiến triển","2"],["Việc hoàn thành","5"],["Vấn đề mở","2"]].map(([l,v])=><div key={l} className="rounded-2xl bg-[#f7f9fc] p-3"><div className="text-xl font-bold">{v}</div><div className="mt-1 text-xs text-[var(--sunbot-muted)]">{l}</div></div>)}</div>
        <Link href="/bao-cao-tuan" className="mt-4 flex items-center justify-between rounded-2xl bg-[#eef5ff] px-4 py-3 text-sm font-bold text-[var(--sunbot-blue)]">Xem bản tổng hợp tuần <ArrowUpRight size={17}/></Link>
      </div>
    </section>
  </div>;
}
