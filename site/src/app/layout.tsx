import type { Metadata } from "next"
import "./globals.css"
import { Inter, Instrument_Serif } from "next/font/google"
import { Analytics } from "@/components/Analytics"
import { CookieBanner } from "@/components/CookieBanner"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })
const instrumentSerif = Instrument_Serif({
	subsets: ["latin"],
	weight: "400",
	style: ["normal", "italic"],
	variable: "--font-display",
})

export const metadata: Metadata = {
	title: "unseal — Detect fake PDF redactions",
	icons: { icon: "/icon.svg", shortcut: "/icon.svg", apple: "/icon.svg" },
	description: "unseal audits PDFs for four known redaction vulnerabilities: text hidden under filled boxes, recoverable prior revisions, metadata leaks, and unapplied annotation markers.",
	keywords: ["pdf redaction", "fake redaction", "pdf security", "redaction audit", "pdf forensics", "unseal", "npm"],
	openGraph: {
		title: "unseal — Detect fake PDF redactions",
		description: "Four PDF redaction vulnerabilities, detected in milliseconds. An npm package for auditing and recovering naïvely redacted documents.",
		url: "https://unseal.dev",
		siteName: "unseal",
		type: "website",
	},
	twitter: {
		card: "summary_large_image",
		title: "unseal — Detect fake PDF redactions",
		description: "Four PDF redaction vulnerabilities, detected in milliseconds.",
	},
	metadataBase: new URL("https://unseal.dev"),
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="en" className={`h-full ${inter.variable} ${instrumentSerif.variable}`}>
			<body className="min-h-full flex flex-col">
				{children}
				<Analytics />
				<CookieBanner />
			</body>
		</html>
	)
}
