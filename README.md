> [!IMPORTANT]
> **Moved.** `unseal` has been folded into **[scrubzero](https://github.com/Liiift-Studio/scrubzero)** — its `audit()` / `unseal()` are now exported from the `scrubzero` npm package (which also does redaction). Install `npm i scrubzero`. This repo is archived and the `@liiift-studio/unseal` package is deprecated.

# unseal

Detect and remove fake PDF redactions. Works on PDFs from any tool — Acrobat, PDFTron, open-redact-pdf, and others.

Someone draws a black box over a Social Security number and ships the PDF. The box is just a rectangle — the text is still in the file, one copy-paste away. `unseal` finds that hidden text (and unapplied redact annotations, leaked prior revisions, and layout leaks) before *you* are the one who leaks it.

[![npm version](https://img.shields.io/npm/v/@liiift-studio/unseal.svg)](https://www.npmjs.com/package/@liiift-studio/unseal)
[![license](https://img.shields.io/npm/l/@liiift-studio/unseal.svg)](./LICENSE)
[![node](https://img.shields.io/node/v/@liiift-studio/unseal.svg)](https://nodejs.org)

![unseal CLI auditing a PDF, finding a Social Security number hidden under a black box, then stripping the fake redaction to recover the underlying text.](https://raw.githubusercontent.com/Liiift-Studio/unseal/main/assets/demo.gif?v=1)

One of the first dedicated fake-redaction detectors on npm.

## Installation

```bash
npm install @liiift-studio/unseal
```

Requires Node.js >= 18. No native binaries — pure JavaScript/TypeScript.

## Check a single file (no project needed)

If you just want to verify one PDF, you don't have to install or write any code — `npx` runs the CLI on demand:

```bash
npx @liiift-studio/unseal audit document.pdf
```

It prints any hidden text it finds and exits non-zero if the document is **not** clean. Everything runs **on your own machine** — your PDF is never uploaded — with one exception: the optional Tier 3 `forensic` pattern oracle, which sends redaction context to an LLM API (see [Security & privacy](#security--privacy)).

If it reports a finding, the document still contains the "redacted" content. Keep your original untouched (chain of custody), then use `strip` to produce a copy with the fake redactions removed so you can see exactly what was exposed:

```bash
npx @liiift-studio/unseal strip document.pdf --output exposed.pdf
```

> `strip` is a forensic/inspection aid: it removes the fake redaction so you can see the leak. It does **not** apply a real redaction. To safely release a document, re-redact the exposed content with a tool that truly removes it, then re-run `audit` to confirm it comes back clean.

## CLI

```bash
# Audit a PDF for fake or insecure redactions
npx @liiift-studio/unseal audit document.pdf

# Use a more thorough preset
npx @liiift-studio/unseal audit document.pdf --preset compliance

# Output as JSON
npx @liiift-studio/unseal audit document.pdf --json

# Strip fake redactions and write a usable PDF
npx @liiift-studio/unseal strip document.pdf --output clean.pdf

# Also write a JSON findings report
npx @liiift-studio/unseal strip document.pdf --output clean.pdf --report findings.json
```

### Presets

| Preset | Checks | Speed |
|---|---|---|
| `quick` (default) | Text-under-box, incremental save, metadata, pending annotations | <100ms |
| `compliance` | All quick checks + glyph position analysis | ~500ms |
| `forensic` | All checks including the LLM pattern oracle | Slow; sends data to an API — see [Security & privacy](#security--privacy) |

### Exit codes

`unseal audit` is designed for scripting and CI:

| Code | Meaning |
|---|---|
| `0` | Clean — no findings |
| `1` | Either findings were detected **or** the file could not be read / audited |

Both "the PDF leaks" and "the tool errored" return `1`; use `--json` and inspect the report when you need to tell them apart. `unseal strip` returns `0` on success regardless of findings (it always writes the recovered PDF).

## API

The library is dual-published (ESM + CommonJS) and fully typed. All functions are async (return Promises) and accept the PDF as an **`ArrayBuffer`**.

```typescript
import { audit, unseal, AuditPresets } from '@liiift-studio/unseal';
import { readFile, writeFile } from 'fs/promises';

// readFile returns a Node Buffer; convert to a tight ArrayBuffer for the API.
const buf = await readFile('document.pdf');
const pdf = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

// Audit — Tier 1 checks
const report = await audit(pdf, AuditPresets.quick);
console.log(report.clean);      // false
console.log(report.findings);   // AuditFinding[]
console.log(report.sha256);     // SHA-256 of the input PDF

// Audit — Tier 2/3 checks
const deepReport = await audit(pdf, AuditPresets.forensic);

// Strip fake redactions
const result = await unseal(pdf, { output: 'both' });
if (result.pdf) {
  await writeFile('clean.pdf', result.pdf);
}
console.log(result.overlaysStripped);       // number
console.log(result.annotationsRemoved);     // number
console.log(result.priorRevisionRecovered); // boolean
for (const f of result.findings) {          // UnsealFinding[]
  console.log(f.scenario, f.recoveredText, f.confidence);
}

// Strip with Tier 2/3 audit included
const result2 = await unseal(pdf, {
  output: 'both',
  auditOptions: { glyphPositionLeak: true, patternOracle: true },
});
```

CommonJS works too: `const { audit } = require('@liiift-studio/unseal');`

`audit()` and `unseal()` **throw** on a file that can't be parsed (corrupt, encrypted, or not a PDF), so wrap calls in `try/catch` in long-running services.

> **Note on input bytes:** pass a tight `ArrayBuffer` as shown above. `Buffer.buffer` alone is the pooled backing store Node allocated and can be larger than (or shared with) your file's bytes — slice it with `byteOffset`/`byteLength` first.

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
| `pattern-oracle` | 3 | — | LLM-ranked candidate strings for each redaction bar, inferred from bar width and surrounding context. Surfaced on findings as `candidates`. |

## Security & privacy

This is a forensics tool. Two limits matter before you rely on it:

- **Tier 3 sends data off your machine.** The `forensic` preset / `patternOracle` option runs an LLM "pattern oracle" that transmits text *around each redaction* and the document's first 500 characters to a third-party LLM API (Anthropic via the Vercel AI Gateway). It is **off by default** — Tier 1 (`quick`) and Tier 2 (`compliance`) are entirely local. **Do not enable Tier 3 on confidential material** (FOIA, HIPAA, e-discovery, sealed records) unless that egress is explicitly permitted. It also requires an `ANTHROPIC_API_KEY` or Vercel AI Gateway credentials and will incur API cost.
- **A `clean` result is not a safety guarantee.** `unseal` detects *improper* redactions using the heuristics above. A **correctly applied** redaction — where the text is genuinely removed and the region flattened/rasterized — leaves nothing to find, which is the secure outcome. `clean: true` means "none of these checks fired," not "this document provably contains no hidden text." Treat findings as actionable; treat a clean result as one signal, not a certification.

Use only on documents you are authorized to inspect. `unseal` recovers content that was meant to be hidden — that capability is for verifying your own releases and authorized forensic review, not for defeating redactions you have no right to read.

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
  candidates?: CandidateString[];  // Tier 3 oracle only
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

// Each recovered redaction (the main output of unseal()).
interface UnsealFinding {
  scenario: 'A' | 'B' | 'C' | 'D';   // A=overlay, B=annotation, C=prior revision, D=layout
  page?: number;
  bbox?: [number, number, number, number];
  recoveredText?: string;
  confidence: number;                // 0–1
  priorRevisionPdf?: Uint8Array;     // recovered prior revision bytes (Scenario C only)
}
```

## Requirements

- Node.js >= 18
- No native binaries
- Tier 3 pattern oracle requires an `ANTHROPIC_API_KEY` or Vercel AI Gateway credentials (see [Security & privacy](#security--privacy))

## Development

```bash
git clone https://github.com/Liiift-Studio/unseal.git
cd unseal
npm install
npm run build      # bundle to dist/ with tsup
npm test           # run the vitest suite
npm run typecheck  # tsc --noEmit
```

The package must be built (`npm run build`) before the CLI or API resolve locally, since `main`/`bin` point at `dist/`.

### Layout

| Path | Contents |
|---|---|
| `src/audit.ts` | `audit()` — orchestrates the checks |
| `src/unseal.ts` | `unseal()` — orchestrates the recovery scenarios |
| `src/checks/` | One file per detection check (Tier 1 & 2) |
| `src/recovery/` | Scenario A–D recovery (strip overlays/annotations, extract prior revision) |
| `src/oracle/` | Naccache-Whelan bar-width enumeration + the Tier 3 LLM oracle |
| `src/presets.ts` | `quick` / `compliance` / `forensic` preset definitions |
| `test/` | vitest suites; `test/helpers/pdf-builder.ts` synthesizes fixtures with no external files |

### Adding a check

1. Add a `checkMyThing(pdf, page?)` in `src/checks/` returning `AuditFinding[]`.
2. Add a flag to `AuditOptions` in `src/types.ts` (and the `check` union if it emits a new check name).
3. Wire it into `audit()` and into the relevant `AuditPresets` in `src/presets.ts`.
4. Add a vitest case using `test/helpers/pdf-builder.ts`.

### Regenerating the demo GIF

```bash
npm run capture   # requires charmbracelet/vhs on PATH: brew install vhs
```

This builds the package, generates a deterministic sample PDF (`scripts/make-sample.mjs`), and records `scripts/demo.tape` to `assets/demo.gif`.

## License

MIT — see [LICENSE](./LICENSE) · [unseal.dev](https://unseal.dev)
