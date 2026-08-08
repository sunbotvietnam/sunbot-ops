import {AppShell} from "@/components/AppShell";

export default function PeopleAdminPage(){
  const people=[["Hoàng Nhung","Sale Operations"],["Dung","Phát triển thị trường"],["Thu","Phát triển thị trường + Trainer"],["Vũ Thảo","Vận hành – tài liệu"]];
  return <AppShell mode="ceo"><div className="space-y-4"><div><h1 className="text-2xl font-bold">Nhân sự & vai trò</h1><p className="mt-1 text-sm text-[var(--sunbot-muted)]">Không hard-code tên người. Một người có thể có nhiều vai trò và đổi vai trò mà không mất lịch sử.</p></div><div className="sb-card p-4">{people.map(([name,role])=><div key={name} className="flex items-center justify-between border-b py-3 last:border-0"><div><div className="font-bold">{name}</div><div className="text-sm text-[var(--sunbot-muted)]">{role}</div></div><button className="rounded-xl border px-3 py-2 text-sm">Đổi vai trò</button></div>)}</div><div className="rounded-2xl border bg-white p-4 text-sm text-[var(--sunbot-muted)]"><b className="text-[var(--sunbot-text)]">Ví dụ:</b> giáo viên được giao thêm nhiệm vụ sale chỉ cần gán thêm vai trò “Phát triển thị trường”; lịch sử giáo viên vẫn được giữ nguyên.</div></div></AppShell>;
}
