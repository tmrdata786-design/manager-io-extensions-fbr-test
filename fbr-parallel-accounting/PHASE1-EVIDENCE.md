# Phase 1 Evidence Matrix

Date: 2026-10-23  
Business: `KEEL`  
API: `26.7.14.3656`  
Mode: Phase 1 was read-only. Phase 3 was limited to one reporting-only GL definition and one `FBR-CONFIG` Folder; no documents, adjustments, fields, settings or accounts were changed.

## Evidence levels

- **Runtime** — observed through the live Manager API with `manager_check`, `manager_query` or `manager_get`.
- **Contract** — confirmed against the live/public OpenAPI document.
- **Source** — confirmed from decompiled ManagerServer source in `C:\Users\pts\AppData\Local\Temp\opencode`.
- **Local** — proven by synthetic-fixture tests in this repository.
- **Unverified** — not yet exercised against live data or a live write.

## Verified facts

| Fact | Evidence | Notes |
|---|---|---|
| FBR checkbox custom field exists | Runtime | `01a16857-7f54-7da0-a97e-2c29ec11bf7e`, `Name=FBR`, `Position=1`, `UniqueName=FBR` |
| FBR checkbox placement | Runtime + Source | 9 placements, exactly the 9 document header types below |
| FBR checkbox description | Runtime | `Tick to include this document in the FBR parallel ledger.` |
| FBR checkbox flags | Runtime | `ExcludeFromCopyingOrCloning=true`, `DisplayOnView=true`, `ShowAtTheTop=true` |
| FBR Adjustment text field exists | Runtime | `01a1685a-e683-7cf0-b9d0-4fac8715f4e9`, `Name=FBR Adjustment` |
| FBR Adjustment type | Runtime + Source | `Type=1` = `ParagraphText`; `Size=2` = `Large` |
| FBR Adjustment placement | Runtime | Folder only (`5d6fae1e-ff34-4870-80e9-8a755842d46e`) |
| FBR Adjustment protection | Runtime | `LockedForManualEditing=true`, `ExcludeFromCopyingOrCloning=true`, `DisplayOnView=true`, `ShowAtTheTop=true` |
| FBR Adjustment description | Runtime | `Internal FBR adjustment JSON. Do not edit manually.` |
| Text fields can store unlimited text | Source | `TextCustomField` guide states all sizes can store unlimited text |
| Folder supports classic and structured custom fields | Source | `Folder.CustomFields` and `Folder.CustomFields2` |
| Folder create contract | Runtime + Contract | `POST /api4/folder-form` with `{ Description, CustomFields2: { Strings: { <fieldKey>: "<json>" } } }`; returns the created record and key. `/api4/folder` with `{ value: { description, customFields2 } }` is a fallback |
| Folder update contract | Runtime + Contract | `PUT /api4/folder-form/{key}` with `Key` plus the complete `Description` / `CustomFields2`; collection `PUT /api4/folder` with `{ key, value }` is a fallback. If neither is accepted, a new `FBR-CONFIG` Folder is appended and the newest config wins by `updatedAt` |
| Collection read paths | Contract | API `26.7.14.3656` exposes plural paths such as `/sales-invoices`, `/credit-notes`, `/journal-entries`, `/receipts`, `/folders`; legacy `-batch` aliases used by older extensions are kept only as fallbacks |
| Folder list contract | Source + Runtime | `GET /api4/folders` returns key and description only (`Folders.GetDescription`), not custom fields. The extension hydrates each key with `GET /api4/folder-form/{key}` before parsing config or adjustments |
| Live folder count | Runtime | 1 (`FBR-CONFIG`) |
| Chart of Accounts rows | Runtime | 164 accounts; `code` is null in `/chart-of-accounts` |
| Chart of Accounts names | Runtime | Codes, emojis and whitespace are embedded in names |
| P&L account metadata | Contract | `/api4/profit-and-loss-statement-account-batch` returns `code`, `name`, `nameWithCode`, `group`, flags |
| BS account metadata | Contract | `/api4/balance-sheet-account-batch` returns the same shape |
| Account classification | Contract | P&L and BS batch endpoints are the reliable source; `/chart-of-accounts` is not |
| FBR-eligible document types expose custom fields | Source + Contract | All 9 types implement `ICustomFields` and expose `CustomFields`/`CustomFields2` |
| Inventory Write-off supports custom fields | Source | `ICustomFields`, but FBR field is not placed on it |
| Production Order supports custom fields | Source | `ICustomFields`, but FBR field is not placed on it |
| Late Payment Fee lacks custom fields | Source | Does not implement `ICustomFields`; cannot be tagged directly |
| GL report definition create contract | Runtime + Contract | `POST /api4/general-ledger-transactions-form` with `{ Description, FromDate, ToDate, Account }`; returns the created record and key. `/api4/general-ledger-transactions` with `{ value: { description, fromDate, toDate, account } }` is a fallback |
| GL report definition read contract | Runtime | `GET /api4/general-ledger-transactions-form/{key}` returns the saved definition |
| GL report definitions list | Unverified | `/api4/general-ledger-transactions-batch` is absent from the live OpenAPI document. The extension treats it as optional and reuses the key stored in `FBR-CONFIG` |
| GL view contract | Contract | `GET /api4/general-ledger-transactions-view?Key=<uuid>` returns `ReportModel2` |
| Live GL definition | Runtime | `01a168d0-734c-7472-91e2-c5f6714c4313`, `FBR-GL-SOURCE 2026-01-01 to 2026-10-23`; read back from the form endpoint |
| Live FBR-CONFIG | Runtime | `01a168d0-a121-73b3-bbc4-9cc6d7e7717c`; stores the FBR dates, `includeForeign:false`, `operator:unverified`, `glReportKey` and `glRange` |
| GL view requires a saved definition | Source | `GetReportModelEndpoint` loads the report by `Key`; no key returns an empty model |
| GL view columns | Source | Debit, Credit, Balance |
| GL view P&L section | Source | One group per P&L account, leaf rows for posted lines, then a net profit/loss row |
| GL view BS section | Source | One group per BS account, optional opening-balance row, leaf rows, optional P&L-for-period row |
| GL view source links | Source | Leaf debit and credit cells carry `Link(href)`; balance cells do not |
| GL view synthetic rows | Source | Opening balance, P&L-for-period and totals have no source link |
| GL view row key | Source | `Row.Key` is not set for transaction rows; source UUID must be parsed from the link |
| GL view zero rows | Source | Rows with `BaseAmount == 0m` are omitted |
| GL view revaluation | Source | `.Revaluate(fromDate, toDate)` is applied |
| GL view fixed/intangible disposal | Source | `.DisposeFixedAssets()` and `.DisposeIntangibleAssets()` are applied |
| GL source link generation | Source | `TransactionViewer.GetViewHandler(Business, e2.Transaction, Referrer)` then `viewHandler.ToUrl()` |
| GL view running balance | Source | Balance is per account and includes synthetic opening rows; do not use it for FBR totals |
| Live transaction count | Runtime | 0 |
| Live 2026 trial balance | Runtime | 0 rows |
| Live GL report view with data | Unverified | Requires transactions; the saved definition exists but KEEL still has 0 transactions |
| Live folder custom-field write/read | Runtime | Created and updated `FBR-CONFIG`, then read the custom-field JSON back through `/folder-form/{key}` |
| Live GL report definition write | Runtime | Created the `FBR-GL-SOURCE` definition, then read it back through `/general-ledger-transactions-form/{key}` |
| Local engine tests | Verified | 18 `node:test` cases pass, including PascalCase, hydrated Folder and foreign-currency fixtures |
| Local browser smoke test | Verified | Synthetic Manager bridge loaded base data, loaded a GL model, created `FBR-CONFIG` and one balanced adjustment through the form endpoints, and rendered a balanced trial balance; no live endpoint was written by the smoke test |
| Foreign-currency document signal | Source | Invoices, notes, receipts and payments derive currency from the party or bank account, so batch JSON has no `currency` field; all document types expose `exchangeRate` / `exchangeRateIsInverse`. The engine treats a non-zero, non-unity rate, a set `currency` field, or an inverse-rate flag as foreign |
| Inventory Write-off GL link behavior | Unverified | No data and no FBR placement |
| Production Order GL link behavior | Unverified | No data and no FBR placement |

## Placement map

The FBR checkbox is placed on exactly these types:

| Document type | Type GUID | Live list endpoint | Directly taggable |
|---|---|---|---|
| Sales Invoice | `ad12b60b-23bf-4421-94df-8be79cef533e` | `sales-invoices` | Yes |
| Purchase Invoice | `58b9eb90-f6b8-4abc-8ea1-12fd77b8336e` | `purchase-invoices` | Yes |
| Credit Note | `245e5943-0092-409d-96ae-e2ee10eac75b` | `credit-notes` | Yes |
| Debit Note | `274fc6d0-2eac-43d0-8286-79c856e644aa` | `debit-notes` | Yes |
| Journal Entry | `5ea52bc4-90ae-4e4a-aec4-ef1224b279ad` | `journal-entries` | Yes |
| Receipt | `7662b887-c8d8-486e-98fd-f9dbcd41c6dc` | `receipts` | Yes |
| Payment | `79f99d26-e43a-4ecb-a9c9-0774601a9b2e` | `payments` | Yes |
| Expense Claim | `02572e0c-0167-4dbd-a392-08d8f67f3fe4` | `expense-claims` | Yes |
| Inter Account Transfer | `dea4f923-c498-4504-b3ef-30be3c33175e` | `inter-account-transfers` | Yes |

The following types support custom fields but are **not** placed, so they cannot be tagged in V1:

| Document type | Type GUID |
|---|---|
| Inventory Write-off | `d7ff6694-f1ef-419f-8ae2-55527a02e95f` |
| Production Order | `da996523-e77e-493c-b134-31c6c6ccae4a` |
| Inventory Transfer | `7eaafddc-54c9-4235-98d2-e8a1ee438150` |
| Depreciation Entry | `75cdc055-6dec-4381-bc40-b670366e6abc` |
| Amortization Entry | `d33519a3-e8e0-4556-9833-b744a58dd2f7` |
| Withholding Tax Receipt | `8f7510d9-a92d-4b4c-9421-fd745e198b3c` |
| Goods Receipt | `866217a4-f841-47de-a4e6-87152405c88d` |
| Payslip | `1d103fa7-6fc1-4951-811e-972968b842cc` |
| Late Payment Fee | `4dada073-022f-464e-bdb3-ff38c83e577f` (no custom fields) |

## V1 scope decision

1. **Direct FBR tagging is limited to the 9 placed types.** The UI reports the other types as not taggable and does not invent tags for them.
2. **Optional types auto-enable if the user later adds the FBR field placement.** The extension checks the field record's `Placement` array against known type GUIDs. It will fetch and include a type only when both the placement and a working batch/list endpoint exist.
3. **Inventory Write-off and Production Order are currently excluded.** They support custom fields but are not placed. If the user adds placement, they become eligible without a code change.
4. **Late Payment Fee is supported indirectly.** A fee is included only when its `salesInvoice` points to an FBR-tagged Sales Invoice. It is disclosed as indirect.
5. **Foreign-currency documents are excluded from V1.** They are listed in the exclusions panel. Because Manager derives invoice/note currency from the party and receipt/payment currency from the bank account, the engine detects foreign documents from a set `currency` field, a non-zero non-unity `exchangeRate`, or `exchangeRateIsInverse`. A foreign document deliberately entered at a rate of exactly 1 is numerically identical to base currency and is not distinguished.
6. **Native opening balances are not imported.** The FBR Balance Sheet starts from the configured FBR start date. Users may enter explicit FBR opening adjustments.
7. **No live write is part of Phase 1 or Phase 2.** The report-definition create and Folder create calls are implemented but only execute from an explicit user action in Phase 3+.

## Open questions for the user

- Should Inventory Write-off and Production Order be added to V1 by placing the FBR checkbox on those types, or remain excluded for now?
- Does the user want FBR start date to be a single fixed date (recommended) or a per-report date?
- Should the first live validation create a disposable GL report definition and a single test adjustment Folder in `KEEL`, or should it wait for a non-production business?
