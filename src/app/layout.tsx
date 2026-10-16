import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic, VT323, Amiri } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const plexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-plex-arabic",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const vt323 = VT323({
  variable: "--font-vt323",
  subsets: ["latin"],
  weight: "400",
});

const amiri = Amiri({
  variable: "--font-amiri",
  subsets: ["arabic", "latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "بروتوكول التاسع | PROTOCOL NINE",
  description:
    "ما حُذف لم يختفِ. ما أُحرق لم يمت. ما نُسي ينتظر من يتذكر. أصلٌ غائب وعشرة بروتوكولات وحارس تاسع لا يشبه أحداً — تحدٍّ تشفيري تنافسي عميق لطلاب جامعة البحرين.",
  keywords: ["بروتوكول التاسع", "PROTOCOL NINE", "أرشيف الغائبين", "THE ABSENT ARCHIVE", "ARG", "جامعة البحرين", "تشفير", "تحدي", "صخير"],
  openGraph: {
    title: "بروتوكول التاسع | PROTOCOL NINE",
    description: "أصلٌ غائب وعشرة بروتوكولات وحارس تاسع لا يشبه أحداً.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#070604",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning className="dark">
      <body
        className={`${plexArabic.variable} ${vt323.variable} ${amiri.variable} antialiased bg-[#070604] text-[#e7dcc4] min-h-screen`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
