# Architecture

## Purpose

FBR Parallel Accounting produces selected-transaction financial reports inside Manager.io. It does not create journals. Every figure is derived from one of three inputs:

1. posted General Ledger rows from a saved GL Transactions report view;
2. document-level `FBR` checkbox values;
3. reporting-only adjustment JSON stored in Manager Folder records.

## Components

| Component | Responsibility |
|---|---|
| `index.html` | Manager bridge, API reads, application state, rendering, explicit write flows |
| `engine.js` | Pure parsing, validation, report computation, CSV and Folder payload builders |
| `tests/engine.test.js` | Synthetic fixtures for the engine only |

The engine has no DOM, network, timer or Manager dependency, so report math can be tested without a live business.

## Manager bridge

The extension listens for a `manager-context` message from the parent frame. The payload supplies `apiEndpoint` and `apiAccessToken`.

Two transports are supported:

- **Direct fetch** — `Authorization: Bearer <token>` against `apiEndpoint`.
- **postMessage bridge** — `{ type: 'api-request', method, path, body }`, matched by `requestId` on `<type>-response`.

Direct fetch is attempted first. If it fails, the bridge is used. Only `/api4/` paths are accepted, and path traversal is rejected.

The iframe never stores the token, never logs it, and never sends data to a third party.

## Load sequence

1. Detect the `FBR` checkbox field and the `FBR Adjustment` text field.
2. Compare the checkbox `placement` array with known type GUIDs.
3. Read P&L accounts, balance sheet accounts, groups, parties, base currency and folders.
4. Parse `FBR-CONFIG` and every `FBR-ADJ/` folder.
5. Fetch each placed document collection and build a document index keyed by UUID.
6. Link Late Payment Fees to their Sales Invoices.
7. When the user confirms, create or reuse a GL definition and read its view.
8. Parse GL rows, apply selection, add adjustments and compute the three reports.

All steps except step 7 are reads. The extension loads base data automatically when the Manager context arrives.

## API dependencies

Read paths used by the extension:

| Purpose | Path |
|---|---|
| Custom fields | `/api4/checkbox-custom-fields`, `/api4/text-custom-fields` |
| Accounts | `/api4/profit-and-loss-statement-account-batch`, `/api4/balance-sheet-account-batch` |
| Document collections | `/api4/sales-invoices`, `/api4/purchase-invoices`, `/api4/credit-notes`, `/api4/debit-notes`, `/api4/journal-entries`, `/api4/receipts`, `/api4/payments`, `/api4/expense-claims`, `/api4/inter-account-transfers` |
| Late fees | `/api4/late-payment-fees` |
| Parties | `/api4/customers`, `/api4/suppliers`, `/api4/employees` |
| Folders | `/api4/folders`, then `/api4/folder-form/{key}` for each row to load custom fields |
| GL definitions | `FBR-CONFIG.glReportKey`; `/api4/general-ledger-transactions-batch` is an optional fallback |
| GL view | `/api4/general-ledger-transactions-view?Key=<uuid>` |

Write paths (only after an explicit confirmation):

| Purpose | Path | Effect |
|---|---|---|
| GL definition | `POST /api4/general-ledger-transactions-form` with PascalCase fields | Reporting definition only; no journal. Collection POST with `{value}` is a fallback |
| Adjustment / config Folder | `POST /api4/folder-form` with `{ Description, CustomFields2 }` | Append-only Folder record. Collection POST with `{value}` is a fallback |
| Config update | `PUT /api4/folder-form/{key}` with `Key` plus complete fields, then `PUT /api4/folder` with `{key, value}` | Updates the existing config Folder; falls back to a new `FBR-CONFIG` Folder if neither update path exists |

The saved GL definition key and range are stored in `FBR-CONFIG`, so a normal reload does not need a definitions list. Legacy `-batch` collection names are used only as fallbacks.

## GL report contract

`GET /api4/general-ledger-transactions-view?Key=<uuid>` returns `ReportModel2`:

- `rows[]` — top-level groups (accounts), with nested `rows[]` leaves;
- leaf `cells[]` — debit, credit and balance;
- debit and credit `cell.link.href` — source transaction view URL;
- synthetic rows — opening balance, P&L-for-period and totals, without a source link;
- `row.key` — not reliable for the source document UUID.

`engine.parseGlReport` therefore:

- walks nested groups;
- maps group names to the account index;
- extracts the document UUID from the link path or query string;
- classifies rows without links as synthetic and excludes them from selected-transaction totals.

The running balance column is intentionally unused because it includes synthetic opening rows.

## Selection rules

A GL row is included when all of the following are true:

1. Its source link resolves to a known document.
2. The document is tagged with `FBR` (or is a Late Payment Fee whose linked Sales Invoice is tagged).
3. The document date is on or after the FBR start date.
4. The document date is on or before the period end.
5. The document is not foreign currency.

Rows are grouped into exclusion buckets: untagged, foreign, pre-start, after-period, missing-date, unresolved-link, late-fee-linked-to-untagged-invoice and missing-linked-invoice. No exclusion is silently reclassified.

## Foreign-currency detection

Manager derives invoice, credit-note and debit-note currency from the party, and receipt/payment/transfer currency from the bank account. Those derived currencies do not appear in batch JSON. The engine therefore treats a document as foreign when any of these is true:

- `currency` is set;
- `exchangeRate` is non-zero and not exactly 1;
- `exchangeRateIsInverse` is true.

A foreign document entered at a rate of exactly 1 is numerically equivalent to base currency and is not distinguished.

## Report math

### Trial balance

All included GL rows plus in-scope adjustment lines, grouped by account. Debit and credit totals must agree. Synthetic equity is not added to the trial balance.

### Profit & Loss

P&L account buckets for the selected period. Income is presented as a positive amount (`-net`); expenses are presented as `net`. The engine computes gross profit, other income/expenses and net profit.

### Balance Sheet

Balance sheet buckets since the FBR start date plus synthetic equity:

- `FBR Retained Earnings` — P&L net before the period start;
- `FBR Current Period Result` — P&L net inside the period;
- `FBR Opening Equity` — balancing line for explicit opening adjustments.

Assets must equal liabilities plus equity. Rows are filtered at a half-cent tolerance.

### Adjustments

Adjustment lines are validated before use:

- schema version, id, type and date;
- at least one line;
- one positive debit or credit per line;
- opening adjustments use balance sheet accounts only;
- normal adjustments must balance;
- reversals must reference an adjustment id;
- unknown account keys produce warnings and an unmapped row, not a silent correction.

Reversals are ordinary adjustment records with debit and credit swapped. The original and its reversal both remain in the ledger, so the net effect is zero, and the original is marked as reversed in the UI.

## Storage format

Every Folder uses the `FBR Adjustment` paragraph field. The value is a JSON string.

Adjustment:

```json
{
  "schemaVersion": 1,
  "id": "ADJ-000001",
  "type": "adjustment",
  "date": "2026-07-01",
  "description": "Reclassify opening receivable",
  "reason": "FBR opening position",
  "reverses": null,
  "operator": "unverified",
  "lines": [
    { "accountKey": "<uuid>", "accountName": "1100 Accounts Receivable", "debit": 1000, "credit": 0, "description": "" },
    { "accountKey": "<uuid>", "accountName": "FBR Opening Equity", "debit": 0, "credit": 1000, "description": "" }
  ],
  "createdAt": "2026-07-01T00:00:00.000Z"
}
```

Configuration:

```json
{
  "schemaVersion": 1,
  "fbrStartDate": "2026-07-01",
  "defaultPeriodFrom": "2026-07-01",
  "defaultPeriodTo": "2026-12-31",
  "includeForeign": false,
  "operator": "unverified",
  "glReportKey": "01a168d0-734c-7472-91e2-c5f6714c4313",
  "glRange": { "from": "2026-07-01", "to": "2026-12-31" },
  "updatedAt": "2026-07-01T00:00:00.000Z"
}
```

`glReportKey` is optional for older configs. When it is absent, the extension looks for an existing `FBR-GL-SOURCE` definition, creates one if needed, and writes the key back to `FBR-CONFIG`.

Folder descriptions:

- `FBR-ADJ/<id> - <description>`
- `FBR-CONFIG`

The newest configuration is selected by `updatedAt`, then by Folder timestamp.

## Controls and failure behaviour

- A failed GL read leaves the previous loaded model in place and surfaces the error.
- A date range not covered by the loaded GL view produces a visible warning and a refresh prompt.
- An invalid adjustment Folder is listed as invalid and excluded from totals.
- A missing account is shown as unmapped and warned; it is never posted to `FBR Suspense`.
- A failed Folder write is reported; no retry is attempted automatically.
- Backup restore previews every row and skips duplicates by id.

## Security

- Only `/api4/` paths are allowed.
- The Manager origin is recorded from the first accepted `manager-context` message and checked on responses.
- No credentials, tokens or business data are written to logs or backups.
- Backups contain configuration, adjustments and report metadata only.

## Deployment

Host `index.html` and `engine.js` in the same directory. The existing repository extensions are single-file; this extension is intentionally two files so the report engine stays testable.

## Test coverage

`node --test tests/engine.test.js` covers:

- link UUID extraction;
- account classification;
- structured and legacy custom fields;
- document indexing, foreign detection and Late Payment Fee linking;
- GL nesting, source links and synthetic rows;
- balanced reports and synthetic equity;
- adjustment validation, reversal handling, config selection and hydrated PascalCase Folder records;
- Folder form payloads and CSV payloads;
- empty-data behaviour;
- field placement detection;
- live endpoint ordering.
