import "@/styles/globals.css"
import type { AppProps } from "next/app"
import Head from "next/head"
import { ThemeProvider } from "@/components/layout/ThemeContext"
import { Sora, JetBrains_Mono } from "next/font/google"

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
})

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500", "600"],
})

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className={`${sora.variable} ${jetBrainsMono.variable}`}>
      <ThemeProvider>
        <Head>
          <title>AI Cyber Forensics Platform</title>
          <meta name="description" content="AI-powered Security Operations Center" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <Component {...pageProps} />
      </ThemeProvider>
    </div>
  )
}
