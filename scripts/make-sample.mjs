// Generates a deterministic sample PDF with a FAKE redaction for the README demo.
// Scenario A: a secret line of text drawn in the content stream, then covered by a
// filled black rectangle. The text is still in the file, so `unseal` recovers it.
// Run: node scripts/make-sample.mjs   ->  assets/secret.pdf
//
// Kept deterministic (no timestamps / network) so the VHS demo GIF is reproducible.

import { writeFile, mkdir } from 'fs/promises';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, '..', 'assets', 'secret.pdf');

// The "redacted" secret. It is rendered as real text, then a black box is drawn
// on top of it in the same content stream — a textbook fake redaction.
const SECRET = 'SSN: 123-45-6789';
const VISIBLE = 'Applicant record — sensitive field below:';

// Build a single content stream: visible line, the secret line, then a filled
// black rectangle covering the secret line's bounding box.
const content = [
	'BT /F1 12 Tf 50 720 Td (' + VISIBLE + ') Tj ET',
	'BT /F1 12 Tf 50 690 Td (' + SECRET + ') Tj ET',
	// Black fill rectangle over the secret (x y w h re, f = fill).
	'0 0 0 rg',
	'48 686 160 18 re',
	'f',
].join('\n');
const contentLen = content.length;

const lines = [];
const offsets = [];
const push = (l) => lines.push(l);

push('%PDF-1.4');
push('%\xe2\xe3\xcf\xd3');

offsets[1] = lines.join('\n').length + 1;
push('1 0 obj');
push('<< /Type /Catalog /Pages 2 0 R >>');
push('endobj');

offsets[2] = lines.join('\n').length + 1;
push('2 0 obj');
push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
push('endobj');

offsets[3] = lines.join('\n').length + 1;
push('3 0 obj');
push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>');
push('endobj');

offsets[4] = lines.join('\n').length + 1;
push('4 0 obj');
push('<< /Length ' + contentLen + ' >>');
push('stream');
push(content);
push('endstream');
push('endobj');

offsets[5] = lines.join('\n').length + 1;
push('5 0 obj');
push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
push('endobj');

const xrefOffset = lines.join('\n').length + 1;
push('xref');
push('0 6');
push('0000000000 65535 f ');
for (let i = 1; i <= 5; i++) {
	push(String(offsets[i] ?? 0).padStart(10, '0') + ' 00000 n ');
}
push('trailer');
// Add author metadata so the metadata-leak check has something to report too.
push('<< /Size 6 /Root 1 0 R >>');
push('startxref');
push(String(xrefOffset));
push('%%EOF');

const pdf = new TextEncoder().encode(lines.join('\n'));

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, pdf);
console.log('Wrote ' + OUT + ' (' + pdf.length + ' bytes)');
