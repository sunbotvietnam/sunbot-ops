import "./globals.css";

export const metadata={title:"SUNBOT OPS",description:"Hệ thống vận hành nội bộ Sunbot"};

export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="vi"><body>{children}</body></html>;
}
