"use client";

import {useState} from "react";
import {CheckCircle2,Save} from "lucide-react";

export default function QuickUpdatePage(){
  const [saved,setSaved]=useState(false);
  return <div className="mx-auto max-w-3xl space-y-4">
    <div><h1 className="text-2xl font-bold">Cập nhật nhanh</h1><p className="mt-1 text-sm text-[var(--sunbot-muted)]">Mục tiêu: hoàn thành trong 30–60 giây.</p></div>
    <div className="sb-card p-4 md:p-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Trường/đơn vị"><select className="sb-input"><option>MN Bình Minh</option><option>MN Hoa Sen</option><option>Không gắn với trường</option></select></Field>
        <Field label="Loại cập nhật"><select className="sb-input"><option>Thị trường</option><option>Công nợ</option><option>Vận hành</option><option>Tài liệu</option><option>Chương trình</option></select></Field>
        <div className="md:col-span-2"><Field label="Kết quả *"><textarea className="sb-input min-h-28" defaultValue="Hiệu trưởng đồng ý xem phương án chuyển giao; đề nghị gửi trước 12/8."/></Field></div>
        <Field label="Trạng thái mới"><select className="sb-input"><option>Không đổi</option><option>Đã làm việc</option><option>Đã gửi đề xuất</option><option>Đang đàm phán</option><option>Đã chốt</option></select></Field>
        <Field label="Việc tiếp theo *"><input className="sb-input" defaultValue="Gửi đề xuất chương trình"/></Field>
        <Field label="Hạn *"><input type="date" className="sb-input" defaultValue="2026-08-12"/></Field>
        <Field label="Mức độ"><select className="sb-input"><option>Bình thường</option><option>Quan trọng</option><option>Cần CEO</option></select></Field>
        <div className="md:col-span-2"><Field label="Nếu cần CEO, ghi rõ cần quyết định/hỗ trợ gì"><input className="sb-input" placeholder="Ví dụ: Duyệt mức chiết khấu tối đa 5%?"/></Field></div>
      </div>
      <div className="mt-4 rounded-2xl bg-[#f6f9fd] p-4 text-sm text-[var(--sunbot-muted)]"><b className="text-[var(--sunbot-text)]">Không ghi:</b> “đã gọi”, “đang follow”. Hãy nêu rõ kết quả, việc tiếp theo và thời hạn.</div>
      <button onClick={()=>setSaved(true)} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--sunbot-blue)] px-5 py-3 font-bold text-white md:w-auto"><Save size={18}/> Lưu cập nhật</button>
      {saved&&<div className="mt-3 flex items-center gap-2 text-sm font-bold text-[var(--sunbot-success)]"><CheckCircle2 size={18}/> Đã lưu bản demo.</div>}
    </div>
  </div>;
}

function Field({label,children}:{label:string;children:React.ReactNode}){
  return <label><span className="mb-1.5 block text-sm font-bold">{label}</span>{children}</label>;
}
