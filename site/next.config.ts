import type { NextConfig } from "next"
import path from "path"

const nextConfig: NextConfig = {
	// unseal has been consolidated into scrubzero's Check mode — send everything there.
	async redirects() {
		return [
			{ source: "/:path*", destination: "https://scrubzero.org/check", permanent: true },
		]
	},
	// Prevent Next.js from bundling heavy native deps — resolve them at runtime.
	serverExternalPackages: ["pdfjs-dist", "opentype.js", "pdf-lib", "unseal"],
	turbopack: {
		root: path.resolve(__dirname, ".."),
	},
	experimental: {
		serverActions: {
			bodySizeLimit: "8mb",
		},
	},
}

export default nextConfig
