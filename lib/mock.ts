export const dashboard={
  name:"Hoàng Nhung",
  role:"Quản lý thị trường Hà Nội · Sale Operations",
  metrics:[
    ["Việc đang mở",8,"3 việc cần xử lý hôm nay","blue"],
    ["Quá hạn",1,"Hồ sơ MN Bình Minh","red"],
    ["Cần CEO",2,"Giá & hồ sơ thanh toán","orange"],
    ["Tiền dự kiến 7 ngày","38tr","2 khoản đang theo dõi","green"]
  ] as const,
  tasks:[
    {school:"MN Bình Minh",title:"Hoàn thiện hồ sơ thanh toán 22 triệu",due:"Hôm nay",urgent:true},
    {school:"MN Hoa Sen",title:"Follow hiệu trưởng mới sau sáp nhập",due:"11/08"},
    {school:"Catalogue chuyển giao",title:"Hoàn thiện file trước khi gửi trường",due:"13/08",ceo:true}
  ]
};

export const schools=[
  {name:"MN Bình Minh",area:"Hà Nội",status:"Hồ sơ thanh toán",next:"Bổ sung biên bản nghiệm thu",due:"10/08",debt:"22tr"},
  {name:"MN Hoa Sen",area:"Hà Nội",status:"Đã làm việc",next:"Gửi đề xuất chuyển giao",due:"12/08",debt:"—"},
  {name:"MN Sao Mai",area:"Hà Nội",status:"Đang chờ",next:"Follow người quyết định mới",due:"14/08",debt:"16tr"}
];
