# unseal

Detect and remove fake PDF redactions. Works on PDFs from any tool — Acrobat, PDFTron, open-redact-pdf, and others.

The first package of its kind on npm.

## Installation

```bash
npm install unseal
```

## CLI

```bash
# Audit a PDF for fake or insecure redactions
npx unseal audit document.pdf

# Use a more thorough preset
npx unseal audit document.pdf --preset compliance

# Output as JSON
npx unseal audit document.pdf --json

# Strip fake redactions and write a usable PDF
npx unseal strip document.pdf --output clean.pdf

# Also write a JSON findings report
npx unseal strip document.pdf --output clean.pdf --report findings.json
```

### Presets

| Preset | Checks | Speed |
|---|---|---|
| `quick` (default) | Text-under-box, incremental save, metadata, pending annotations | <100ms |
| `compliance` | All quick checks + glyph position analysis | ~500ms |
| `forensic` | All checks including pattern oracle | Slow |

## API

```typescript
import { audit, unseal, AuditPresets } from 'unseal';
import { readFile, writeFile } from 'fs/promises';

const pdf = await readFile('document.pdf');

// Audit — Tier 1 checks
const report = await audit(pdf.buffer, AuditPresets.quick);
console.log(report.clean);      // false
console.log(report.findings);   // AuditFinding[]
console.log(report.sha256);     // SHA-256 of the input PDF

// Audit — Tier 2/3 checks
const deepReport = await audit(pdf.buffer, AuditPresets.forensic);

// Strip fake redactions
const result = await unseal(pdf.buffer, { output: 'both' });
if (result.pdf) {
  await writeFile('clean.pdf', result.pdf);
}
console.log(result.overlaysStripped);       // number
console.log(result.annotationsRemoved);     // number
console.log(result.priorRevisionRecovered); // boolean

// Strip with Tier 2/3 audit included
const result2 = await unseal(pdf.buffer, {
  output: 'both',
  auditOptions: { glyphPositionLeak: true, patternOracle: true },
});
```

## How it works

Fake redactions fall into four scenarios:

| Scenario | Description |
|---|---|
| **A** | Black rectangle drawn over text in the content stream — text is still in the file |
| **B** | Redact annotation added but never applied — underlying text untouched |
| **C** | PDF saved incrementally — prior unredacted revision still in the file |
| **D** | Text removed from content stream but detectable by layout analysis |

### Checks

| Check | Tier | Severity | What it detects |
|---|---|---|---|
| `text-under-box` | 1 | CRITICAL | Text covered by a filled rectangle |
| `incremental-save` | 1 | HIGH | Multiple `%%EOF` markers (prior revision present) |
| `metadata-leak` | 1 | INFO/MEDIUM | Author, email, phone in PDF metadata |
| `pending-annotation` | 1 | CRITICAL | Unapplied `/Redact` annotations |
| `glyph-position` | 2 | HIGH/MEDIUM | Character spacing anomalies inconsistent with the embedded font's advance widths — indicates OCR reconstruction or uniform-width character substitution |
| `pattern-oracle` | 3 | — | LLM-ranked candidate strings for each redaction bar, inferred from bar width and surrounding context |

## Types

```typescript
interface AuditReport {
  clean: boolean;
  findings: AuditFinding[];
  checkedAt: string;    // ISO 8601
  sha256: string;       // SHA-256 hex of input PDF
}

interface AuditFinding {
  check: 'text-under-box' | 'incremental-save' | 'metadata-leak' | 'pending-annotation' | 'glyph-position';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  page?: number;
  bbox?: [number, number, number, number];
  detail: string;
  recoveredText?: string;
  candidates?: CandidateString[];  // Tier 3 only
}

interface CandidateString {
  text: string;
  confidence: number;   // 0–1
  reasoning: string;
}

interface UnsealOptions {
  stripOverlays?: boolean;          // Default: true
  stripAnnotations?: boolean;       // Default: true
  extractPriorRevision?: boolean;   // Default: true
  annotateCandidates?: boolean;     // Default: true
  output?: 'pdf' | 'report' | 'both';  // Default: 'both'
  includeAudit?: boolean;           // Default: true
  auditOptions?: AuditOptions;      // Enable Tier 2/3 checks
}

interface UnsealResult {
  pdf?: Uint8Array;
  findings: UnsealFinding[];
  overlaysStripped: number;
  annotationsRemoved: number;
  priorRevisionRecovered: boolean;
  auditReport?: AuditReport;
}
```

## Requirements

- Node.js >= 18
- No native binaries
- Tier 3 pattern oracle requires an `ANTHROPIC_API_KEY` or Vercel AI Gateway credentials

## License

MIT — [unseal.dev](https://unseal.dev)
