import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Catatan Minyak & BBM | Manajemen Modal & Konsumsi KM/L",
  description:
    "Aplikasi pencatatan modal minyak, pembagian jatah sekali isi, uang harian, dan perhitungan rata-rata konsumsi BBM (km/L).",
  icons: {
    icon: "/logo.jpg",
    apple: "/logo.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}

