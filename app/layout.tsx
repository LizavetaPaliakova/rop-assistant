import type { Metadata } from "next"
import { Geist } from "next/font/google"
import "./globals.css"
import { AmoProvider } from "@/context/amo-context"
import { Providers } from "./providers"

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" })

export const metadata: Metadata = {
  title: "ROP Assistant — Аналитика продаж",
  description: "Аналитика и управление отделом продаж с интеграцией AmoCRM",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={geist.variable}>
      <body className="bg-slate-950 text-slate-100 antialiased">
        <Providers>
          <AmoProvider>{children}</AmoProvider>
        </Providers>
      </body>
    </html>
  )
}
