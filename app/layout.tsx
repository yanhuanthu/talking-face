import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VoiceFace Lab · 唇形生成工作台",
  description: "上传参考图片或视频，通过文字、语音与情感描述生成说话人脸视频。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
