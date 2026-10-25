# FBR Parallel Accounting

An iframe extension for Manager.io that builds FBR **selected-transaction** Trial Balance, Profit & Loss and Balance Sheet reports from posted General Ledger rows. Documents are included only when they carry the `FBR` checkbox, and reporting-only adjustments are stored as append-only Manager Folder records.

This is a parallel reporting ledger, not a statutory report and not a replacement for Manager's own financial statements.

## Status

- Phase 1 read-only verification: complete.
- Phase 2 implementation and local tests: complete.
- Phase 3 live validation in Manager: **not started**.
- No Manager journals are posted. No existing document, custom field or FBR flag is edited.

## Files

| File | Purpose |
|---|---|
| `index.html` | User interface, Manager bridge, read/load orchestration |
| `engine.js` | Pure reporting engine (no DOM, no network) |
| `tests/engine.test.js` | Synthetic-fixture tests, run with Node |
| `docs/PHASE1-EVIDENCE.md` | Verified API/source facts and scope decisions |
| `docs/architecture.md` | Data flow, storage format and control design |

`index.html` loads `engine.js` as a sibling file, so **both files must be hosted in the same directory**. This differs from the other single-file extensions in this repository.

## Install

1. Host the whole `fbr-parallel-accounting` folder on a static host (GitHub Pages, Netlify, Vercel, or any HTTPS host).
2. In Manager.io: **Settings -> Extensions -> Add Custom Extension**.
3. Paste the URL of `index.html` and choose the placement.
4. Open the extension; it reads the Manager context passed to the iframe automatically.

The extension works with Manager's `postMessage` bridge and, when the context exposes an API token, with direct `fetch` calls. No external service is contacted.

## Manager prerequisites

1. Create a checkbox custom field named exactly **`FBR`**.
2. Place it on the document headers to be tagged: Sales Invoice, Purchase Invoice, Credit Note, Debit Note, Journal Entry, Receipt, Payment, Expense Claim, Inter Account Transfer.
3. Create a paragraph text custom field named exactly **`FBR Adjustment`**.
4. Place it on **Folder** and set it to Large / locked for manual editing.
5. Tick `FBR` on the documents that belong in the parallel ledger.

The extension detects the fields by name. Unknown or unplaced document types are shown as excluded rather than silently included.

## Use

1. Set the **FBR start** date. This is the beginning of the parallel ledger; native pre-FBR balances are excluded.
2. Set the reporting period.
3. Click **Load** to read fields, accounts, folders and tagged documents.
4. Click **Prepare / refresh GL report** to create or reuse a reporting-only GL Transactions definition and load its view.
5. Review **Documents**, **Reconciliation** and the three reports.
6. Add **Adjustments** or **Opening balances** when the selected-transaction ledger needs a correction. Every save is an explicit, confirmed Folder creation.
7. Export CSV or a JSON backup from **Settings**.

The GL definition is named with the `FBR-GL-SOURCE` prefix. Its key and date range are stored in `FBR-CONFIG` and reused; creating it is a live Manager write, but it does not post a journal.

## Storage

Adjustments live in Manager Folders:

- adjustment folder description: `FBR-ADJ/<id> - <description>`
- configuration folder description: `FBR-CONFIG`
- JSON payload: the `FBR Adjustment` custom field (`CustomFields2.Strings` on the form endpoint; read as either case)

Adjustment records are append-only. To correct an adjustment, create a reversal and then a new adjustment. The extension never edits or deletes an adjustment folder. `FBR-CONFIG` is updated in place when Manager accepts the update; otherwise a newer config folder is appended. The extension never uses localStorage, cookies or an external database as the source of truth.

Operator is recorded as `unverified` because Manager does not expose the authenticated user to the iframe.

## What is included

- Directly tagged Sales Invoices, Purchase Invoices, Credit Notes, Debit Notes, Journal Entries, Receipts, Payments, Expense Claims and Inter Account Transfers.
- Late Payment Fees indirectly, when the linked Sales Invoice is tagged.
- Optional document types only when the `FBR` field is later placed on them.

## What is excluded

- Untagged documents and documents before the FBR start date.
- Foreign-currency documents in V1.
- Native opening balances and automatic revaluation rows.
- Inventory Write-off, Production Order and other types until the `FBR` field is placed on them.
- Unknown GL source links are excluded and reported, never plugged into suspense.

## Controls

- Included GL rows must balance.
- Adjustments must balance; opening adjustments auto-balance to `FBR Opening Equity`.
- The trial balance and balance sheet must balance.
- Unresolved links, unmapped accounts, foreign rows and untagged rows are reported as warnings.
- Synthetic equity rows are labelled: `FBR Retained Earnings`, `FBR Current Period Result`, `FBR Opening Equity`.

## Development

```powershell
node --check engine.js
node --test tests\engine.test.js
```

The engine is a UMD module and can be required directly in Node. The tests use synthetic documents, GL rows and Folder payloads only; they do not call Manager.

## Limitations

- Manager `26.7.14.3656` exposes plural collection paths (`/sales-invoices`, `/folders`, ...). Legacy `-batch` aliases used by older extensions are kept as fallbacks.
- Invoice, credit-note and debit-note currency is derived from the party, and receipt/payment currency from the bank account, so it is not present in batch JSON. Foreign detection therefore uses `currency`, a non-zero non-unity `exchangeRate`, or `exchangeRateIsInverse`.
- A foreign document deliberately entered at an exchange rate of exactly 1 is numerically identical to base currency and is not distinguished.
- `index.html` and `engine.js` must be hosted together.
