import {TaskItem} from "@/components/TaskItem";
import {dashboard} from "@/lib/mock";

export default function TasksPage(){
  const more=[{school:"MN Sao Mai",title:"Kiểm tra đầu mối sau sáp nhập",due:"14/08"}];
  return <div className="space-y-4"><div><h1 className="text-2xl font-bold">Công việc của tôi</h1><p className="mt-1 text-sm text-[var(--sunbot-muted)]">Mỗi việc phải có người chịu trách nhiệm, việc tiếp theo và hạn.</p></div><div className="flex flex-wrap gap-2">{["Đang làm 6","Chờ 2","Quá hạn 1","Hoàn thành 12"].map((x,i)=><button key={x} className={`rounded-full px-4 py-2 text-sm ${i===0?"bg-[var(--sunbot-blue)] font-bold text-white":"border bg-white"}`}>{x}</button>)}</div><div className="sb-card p-4">{dashboard.tasks.concat(more).map((t,i)=><TaskItem key={i} {...t}/>)}</div></div>;
}
