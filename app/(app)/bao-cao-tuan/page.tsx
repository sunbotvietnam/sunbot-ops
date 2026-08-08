export default function WeeklyReportPage(){
  const boxes=[
    ["Kết quả chính",["5 công việc hoàn thành","6 trường được cập nhật","2 trường tiến triển trạng thái","22 triệu hồ sơ thanh toán được hoàn thiện"]],
    ["Thay đổi quan trọng",["MN Hoa Sen: chuẩn bị đề xuất","MN Bình Minh: thiếu biên bản nghiệm thu","Catalogue chuyển giao: chờ CEO duyệt"]],
    ["Vấn đề đang mở",["2 việc cần CEO hỗ trợ","1 công việc quá hạn","1 khoản công nợ cần theo dõi"]],
    ["Ưu tiên tuần tới",["Gửi đề xuất MN Hoa Sen","Hoàn tất hồ sơ MN Bình Minh","Cập nhật trạng thái 100% trường đang phụ trách"]]
  ] as const;
  return <div className="mx-auto max-w-4xl space-y-4"><div><div className="sb-chip">Tự động tổng hợp</div><h1 className="mt-2 text-2xl font-bold">Báo cáo tuần 03–08/08</h1><p className="mt-1 text-sm text-[var(--sunbot-muted)]">Không viết lại từ đầu. Chỉ review, bổ sung nhận định và gửi.</p></div><div className="grid gap-4 md:grid-cols-2">{boxes.map(([title,items])=><div key={title} className="sb-card p-4"><h2 className="font-bold">{title}</h2><ul className="mt-3 space-y-2 text-sm">{items.map(x=><li key={x}>• {x}</li>)}</ul></div>)}</div><div className="sb-card p-4"><div className="font-bold">Nhận định của tôi</div><textarea className="sb-input mt-3 min-h-28" placeholder="Điều gì đáng chú ý nhất? Xu hướng nào CEO cần biết?"/><button className="mt-4 rounded-2xl bg-[var(--sunbot-blue)] px-5 py-3 font-bold text-white">Gửi báo cáo tuần</button></div></div>;
}
