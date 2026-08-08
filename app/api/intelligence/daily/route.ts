export async function GET(){
  return Response.json({
    generated_at:new Date().toISOString(),
    ceo_attention:[{subject:"MN Hoa Sen",signal:"Cần duyệt trần chiết khấu 5%",severity:"high"}],
    market_changes:[{subject:"MN Hoa Sen",signal:"Chuyển sang giai đoạn chuẩn bị đề xuất",severity:"medium"}],
    cash_signals:[{subject:"MN Bình Minh",amount:22000000,signal:"Thiếu biên bản nghiệm thu",severity:"high"}],
    execution_risks:[],
    deadlines:[]
  });
}
