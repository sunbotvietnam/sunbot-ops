"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {Bell,BriefcaseBusiness,ClipboardPlus,FileText,Home,School,ShieldCheck,Users} from "lucide-react";

const staffNav=[
  {href:"/",label:"Trang chủ",icon:Home},
  {href:"/cap-nhat",label:"Cập nhật",icon:ClipboardPlus},
  {href:"/cong-viec",label:"Công việc",icon:BriefcaseBusiness},
  {href:"/truong",label:"Trường",icon:School},
  {href:"/bao-cao-tuan",label:"Báo cáo tuần",icon:FileText}
];

export function AppShell({children,mode="staff"}:{children:React.ReactNode;mode?:"staff"|"ceo"}){
  const pathname=usePathname();
  return <div className="min-h-screen">
    <header className="sticky top-0 z-30 border-b border-[var(--sunbot-border)] bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
        <div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-2xl bg-[var(--sunbot-blue)] font-bold text-white">S</div><div><div className="font-bold">SUNBOT OPS</div><div className="text-xs text-[var(--sunbot-muted)]">Vận hành · Thị trường · Báo cáo</div></div></div>
        <div className="flex items-center gap-2"><button className="grid size-10 place-items-center rounded-xl border"><Bell size={18}/></button><div className="grid size-10 place-items-center rounded-full bg-[#e8f1ff] font-bold text-[var(--sunbot-blue)]">NV</div></div>
      </div>
    </header>
    <div className="mx-auto grid max-w-7xl grid-cols-1 md:grid-cols-[220px_1fr]">
      <aside className="hidden min-h-[calc(100vh-65px)] border-r border-[var(--sunbot-border)] bg-white/70 p-3 md:block">
        <div className="space-y-1">{mode==="ceo" ? <><Nav href="/ceo" label="Tổng quan CEO" icon={ShieldCheck} current={pathname}/><Nav href="/quan-tri/nhan-su" label="Nhân sự & quyền" icon={Users} current={pathname}/></> : staffNav.map(i=><Nav key={i.href} {...i} current={pathname}/>)}</div>
        <div className="mt-6 rounded-2xl bg-[#f0f7ff] p-3 text-sm"><div className="font-bold text-[var(--sunbot-navy)]">Nguyên tắc</div><p className="mt-1 text-[var(--sunbot-muted)]">Chỉ cập nhật khi có thay đổi. Mỗi cập nhật phải có kết quả, việc tiếp theo và hạn.</p></div>
      </aside>
      <main className="min-w-0 px-4 py-5 pb-24 md:px-7 md:py-7">{children}</main>
    </div>
    {mode==="staff" && <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-[var(--sunbot-border)] bg-white md:hidden">{staffNav.map(({href,label,icon:Icon})=>{const active=href==="/"?pathname==="/":pathname.startsWith(href);return <Link key={href} href={href} className={`flex flex-col items-center gap-1 px-1 py-2 text-[11px] ${active?"font-bold text-[var(--sunbot-blue)]":"text-[var(--sunbot-muted)]"}`}><Icon size={19}/><span>{label.replace(" tuần","")}</span></Link>})}</nav>}
  </div>;
}

function Nav({href,label,icon:Icon,current}:{href:string;label:string;icon:any;current:string}){
  const active=href==="/"?current==="/":current.startsWith(href);
  return <Link href={href} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${active?"bg-[#eaf2ff] font-bold text-[var(--sunbot-blue)]":"text-[var(--sunbot-muted)] hover:bg-white"}`}><Icon size={18}/>{label}</Link>;
}
