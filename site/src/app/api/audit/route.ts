// API route — receives a PDF upload and returns an audit report.
import { type NextRequest } from "next/server"

const MAX_BYTES = 4 * 1024 * 1024 // 4 MB

export async function POST(req: NextRequest) {
	let formData: FormData
	try {
		formData = await req.formData()
	} catch {
		return Response.json({ error: "Invalid request" }, { status: 400 })
	}

	const file = formData.get("pdf")
	if (!(file instanceof File)) {
		return Response.json({ error: "No PDF file provided" }, { status: 400 })
	}
	if (file.size > MAX_BYTES) {
		return Response.json({ error: "File too large — maximum is 4 MB" }, { status: 413 })
	}
	if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
		return Response.json({ error: "File must be a PDF" }, { status: 415 })
	}

	try {
		const { audit } = await import("unseal")
		const buffer = await file.arrayBuffer()
		const report = await audit(buffer)
		return Response.json({ report })
	} catch (err) {
		console.error("Unseal audit error:", err)
		return Response.json({ error: "Audit failed — the PDF may be malformed or encrypted" }, { status: 500 })
	}
}
