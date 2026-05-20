// Synthetic PDF construction helpers used in tests — no external PDF files required.

/**
 * Builds a minimal but valid PDF containing the given text string on one page.
 * Returns the PDF as an ArrayBuffer.
 */
export function buildMinimalPdf(text: string): ArrayBuffer {
	// Escape special PDF string characters.
	const safeText = text.replace(/[()\\]/g, (c) => '\\' + c);

	const content = `BT /F1 12 Tf 50 700 Td (${safeText}) Tj ET`;
	const contentLen = content.length;

	// Object offsets — we'll calculate them manually.
	const lines: string[] = [];
	const offsets: number[] = [];

	const push = (line: string) => lines.push(line);

	push('%PDF-1.4');
	push('%\xe2\xe3\xcf\xd3'); // Binary comment to signal binary content.

	// Object 1: Catalog
	offsets[1] = lines.join('\n').length + 1;
	push('1 0 obj');
	push('<< /Type /Catalog /Pages 2 0 R >>');
	push('endobj');

	// Object 2: Pages
	offsets[2] = lines.join('\n').length + 1;
	push('2 0 obj');
	push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
	push('endobj');

	// Object 3: Page
	offsets[3] = lines.join('\n').length + 1;
	push('3 0 obj');
	push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>');
	push('endobj');

	// Object 4: Content stream
	offsets[4] = lines.join('\n').length + 1;
	push('4 0 obj');
	push(`<< /Length ${contentLen} >>`);
	push('stream');
	push(content);
	push('endstream');
	push('endobj');

	// Object 5: Font
	offsets[5] = lines.join('\n').length + 1;
	push('5 0 obj');
	push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
	push('endobj');

	// Cross-reference table
	const xrefOffset = lines.join('\n').length + 1;
	push('xref');
	push('0 6');
	push('0000000000 65535 f ');
	for (let i = 1; i <= 5; i++) {
		push(String(offsets[i] ?? 0).padStart(10, '0') + ' 00000 n ');
	}

	push('trailer');
	push('<< /Size 6 /Root 1 0 R >>');
	push('startxref');
	push(String(xrefOffset));
	push('%%EOF');

	const pdfStr = lines.join('\n');
	return new TextEncoder().encode(pdfStr).buffer;
}

/**
 * Builds a PDF that contains two %%EOF markers, simulating an incremental save.
 * The second revision appends a trivial xref update after the first %%EOF.
 */
export function buildPdfWithIncrementalSave(): ArrayBuffer {
	const firstRevision = buildMinimalPdf('Original content');
	const firstBytes = new Uint8Array(firstRevision);

	// Append a minimal incremental update with a second %%EOF.
	const increment = new TextEncoder().encode(
		'\nxref\n0 1\n0000000000 65535 f \ntrailer\n<< /Size 6 /Root 1 0 R /Prev 0 >>\nstartxref\n9999\n%%EOF\n',
	);

	const combined = new Uint8Array(firstBytes.length + increment.length);
	combined.set(firstBytes, 0);
	combined.set(increment, firstBytes.length);

	return combined.buffer;
}
