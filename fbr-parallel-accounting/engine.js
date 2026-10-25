(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FbrEngine = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const SCHEMA_VERSION = 1;
  const FBR_FIELD_NAME = 'FBR';
  const ADJUSTMENT_FIELD_NAME = 'FBR Adjustment';
  const FOLDER_PREFIX = 'FBR-ADJ/';
  const CONFIG_PREFIX = 'FBR-CONFIG';
  const SYNTHETIC = Object.freeze({
    retained: 'FBR Retained Earnings',
    current: 'FBR Current Period Result',
    opening: 'FBR Opening Equity',
    unmapped: 'FBR Unmapped Account',
    suspense: 'FBR Suspense'
  });

  const DOC_TYPES = Object.freeze([
    { key: 'sales-invoice', label: 'Sales Invoice', typeGuid: 'ad12b60b-23bf-4421-94df-8be79cef533e', endpoints: ['/api2/sales-invoices'], placement: true, customFields: true, partyField: 'customer', dateFields: ['issueDate', 'date'], referenceFields: ['reference', 'number'] },
    { key: 'purchase-invoice', label: 'Purchase Invoice', typeGuid: '58b9eb90-f6b8-4abc-8ea1-12fd77b8336e', endpoints: ['/api2/purchase-invoices'], placement: true, customFields: true, partyField: 'supplier', dateFields: ['issueDate', 'date'], referenceFields: ['reference', 'number'] },
    { key: 'credit-note', label: 'Credit Note', typeGuid: '245e5943-0092-409d-96ae-e2ee10eac75b', endpoints: ['/api2/credit-notes'], placement: true, customFields: true, partyField: 'customer', dateFields: ['issueDate', 'date'], referenceFields: ['reference', 'number'] },
    { key: 'debit-note', label: 'Debit Note', typeGuid: '274fc6d0-2eac-43d0-8286-79c856e644aa', endpoints: ['/api2/debit-notes'], placement: true, customFields: true, partyField: 'supplier', dateFields: ['issueDate', 'date'], referenceFields: ['reference', 'number'] },
    { key: 'journal-entry', label: 'Journal Entry', typeGuid: '5ea52bc4-90ae-4e4a-aec4-ef1224b279ad', endpoints: ['/api2/journal-entries'], placement: true, customFields: true, partyField: null, dateFields: ['date'], referenceFields: ['reference', 'number'] },
    { key: 'receipt', label: 'Receipt', typeGuid: '7662b887-c8d8-486e-98fd-f9dbcd41c6dc', endpoints: ['/api2/receipts'], placement: true, customFields: true, partyField: null, dateFields: ['date'], referenceFields: ['reference', 'number'] },
    { key: 'payment', label: 'Payment', typeGuid: '79f99d26-e43a-4ecb-a9c9-0774601a9b2e', endpoints: ['/api2/payments'], placement: true, customFields: true, partyField: null, dateFields: ['date'], referenceFields: ['reference', 'number'] },
    { key: 'expense-claim', label: 'Expense Claim', typeGuid: '02572e0c-0167-4dbd-a392-08d8f67f3fe4', endpoints: ['/api2/expense-claims'], placement: true, customFields: true, partyField: 'paidBy', dateFields: ['date'], referenceFields: ['reference', 'number'] },
    { key: 'inter-account-transfer', label: 'Inter Account Transfer', typeGuid: 'dea4f923-c498-4504-b3ef-30be3c33175e', endpoints: ['/api2/inter-account-transfers'], placement: true, customFields: true, partyField: null, dateFields: ['date'], referenceFields: ['reference', 'number'] },
    { key: 'inventory-write-off', label: 'Inventory Write-off', typeGuid: 'd7ff6694-f1ef-419f-8ae2-55527a02e95f', endpoints: ['/api2/inventory-write-offs'], placement: false, customFields: true, partyField: null, dateFields: ['date'], referenceFields: ['reference', 'number'] },
    { key: 'production-order', label: 'Production Order', typeGuid: 'da996523-e77e-493c-b134-31c6c6ccae4a', endpoints: ['/api2/production-orders'], placement: false, customFields: true, partyField: null, dateFields: ['date'], referenceFields: ['reference', 'number'] },
    { key: 'inventory-transfer', label: 'Inventory Transfer', typeGuid: '7eaafddc-54c9-4235-98d2-e8a1ee438150', endpoints: ['/api2/inventory-transfers'], placement: false, customFields: true, partyField: null, dateFields: ['date'], referenceFields: ['reference', 'number'] },
    { key: 'depreciation-entry', label: 'Depreciation Entry', typeGuid: '75cdc055-6dec-4381-bc40-b670366e6abc', endpoints: ['/api2/depreciation-entries'], placement: false, customFields: true, partyField: null, dateFields: ['date'], referenceFields: ['reference', 'number'] },
    { key: 'amortization-entry', label: 'Amortization Entry', typeGuid: 'd33519a3-e8e0-4556-9833-b744a58dd2f7', endpoints: ['/api2/amortization-entries'], placement: false, customFields: true, partyField: null, dateFields: ['date'], referenceFields: ['reference', 'number'] },
    { key: 'withholding-tax-receipt', label: 'Withholding Tax Receipt', typeGuid: '8f7510d9-a92d-4b4c-9421-fd745e198b3c', endpoints: ['/api2/withholding-tax-receipts'], placement: false, customFields: true, partyField: 'customer', dateFields: ['date'], referenceFields: ['reference', 'number'] },
    { key: 'goods-receipt', label: 'Goods Receipt', typeGuid: '866217a4-f841-47de-a4e6-87152405c88d', endpoints: ['/api2/goods-receipts'], placement: false, customFields: true, partyField: null, dateFields: ['date'], referenceFields: ['reference', 'number'] },
    { key: 'payslip', label: 'Payslip', typeGuid: '1d103fa7-6fc1-4951-811e-972968b842cc', endpoints: ['/api2/payslips'], placement: false, customFields: true, partyField: 'employee', dateFields: ['date'], referenceFields: ['reference', 'number'] }
  ]);

  const LATE_FEE_TYPE = Object.freeze({
    key: 'late-payment-fee',
    label: 'Late Payment Fee',
    typeGuid: '4dada073-022f-464e-bdb3-ff38c83e577f',
    endpoints: ['/api2/late-payment-fees'],
    placement: false,
    customFields: false,
    partyField: 'customer',
    dateFields: ['date'],
    referenceFields: ['reference', 'number']
  });

  const PL_SECTIONS = Object.freeze([
    { id: 'income', label: 'Income' },
    { id: 'costOfSales', label: 'Cost of Sales' },
    { id: 'expenses', label: 'Expenses' },
    { id: 'otherIncome', label: 'Other Income' },
    { id: 'otherExpenses', label: 'Other Expenses' }
  ]);

  const BS_SECTIONS = Object.freeze([
    { id: 'asset', label: 'Assets' },
    { id: 'liability', label: 'Liabilities' },
    { id: 'equity', label: 'Equity' }
  ]);

  function num(value) {
    if (value === null || value === undefined || value === '') return 0;
    if (typeof value === 'object') {
      if ('value' in value) return num(value.value);
      if ('amount' in value) return num(value.amount);
      return 0;
    }
    if (typeof value === 'string') {
      const cleaned = value.replace(/,/g, '').replace(/[^\d.\-+]/g, '');
      if (cleaned === '' || cleaned === '-' || cleaned === '+') return 0;
      const parsed = Number(cleaned);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function round2(value) {
    const n = num(value);
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }

  function money(value) {
    return round2(value).toFixed(2);
  }

  function normalize(value) {
    return String(value === null || value === undefined ? '' : value)
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function compact(value) {
    return normalize(value).replace(/ /g, '');
  }

  function parseDateOnly(value) {
    if (!value) return null;
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value.toISOString().slice(0, 10);
    }
    const text = String(value).trim();
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;
    const parsed = new Date(text);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
    return null;
  }

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function firstDayOfYear(date) {
    const d = date || todayISO();
    return `${String(d).slice(0, 4)}-01-01`;
  }

  function isDateInRange(date, from, to) {
    if (!date) return false;
    if (from && date < from) return false;
    if (to && date > to) return false;
    return true;
  }

  function unwrapItem(value) {
    if (!value || typeof value !== 'object') return null;
    if (value.item && typeof value.item === 'object') return value.item;
    return value;
  }

  function itemKey(value) {
    if (!value || typeof value !== 'object') return null;
    return value.key || value.item?.key || value.item?.Key || value.Key || null;
  }

  function readCheckbox(record, fieldKey) {
    if (!record || !fieldKey) return false;
    const cf2 = record.customFields2 || record.CustomFields2;
    const booleans = cf2 && (cf2.booleans || cf2.Booleans);
    if (booleans && Object.prototype.hasOwnProperty.call(booleans, fieldKey)) {
      return !!booleans[fieldKey];
    }
    const cf = record.customFields || record.CustomFields;
    if (cf && Object.prototype.hasOwnProperty.call(cf, fieldKey)) {
      const value = cf[fieldKey];
      return value === true || value === 'true' || value === 1 || value === '1' || value === 'Yes' || value === 'yes';
    }
    return false;
  }

  function readTextField(record, fieldKey) {
    if (!record || !fieldKey) return null;
    const cf2 = record.customFields2 || record.CustomFields2;
    const strings = cf2 && (cf2.strings || cf2.Strings);
    if (strings && Object.prototype.hasOwnProperty.call(strings, fieldKey)) {
      return strings[fieldKey];
    }
    const cf = record.customFields || record.CustomFields;
    if (cf && Object.prototype.hasOwnProperty.call(cf, fieldKey)) return cf[fieldKey];
    return null;
  }

  function fieldValue(record, name) {
    if (!record) return undefined;
    if (record[name] !== undefined) return record[name];
    const pascal = name.charAt(0).toUpperCase() + name.slice(1);
    return record[pascal];
  }

  function firstString(record, fields) {
    if (!record) return '';
    for (const field of fields) {
      const value = fieldValue(record, field);
      if (value !== null && value !== undefined && String(value).trim() !== '') return String(value).trim();
    }
    return '';
  }

  function firstDate(record, fields) {
    if (!record) return null;
    for (const field of fields) {
      const value = parseDateOnly(fieldValue(record, field));
      if (value) return value;
    }
    return null;
  }

  function detectFbrFields(fields) {
    const checkboxes = fields?.checkboxCustomFields || fields?.checkboxCustomField || fields?.checkbox || [];
    const texts = fields?.textCustomFields || fields?.textCustomField || fields?.text || [];
    const checkboxList = Array.isArray(checkboxes) ? checkboxes : [checkboxes];
    const textList = Array.isArray(texts) ? texts : [texts];
    const checkbox = checkboxList.map(unwrapItem).find((field) => field && normalize(field.name || field.Name) === normalize(FBR_FIELD_NAME));
    const adjustment = textList.map(unwrapItem).find((field) => field && normalize(field.name || field.Name) === normalize(ADJUSTMENT_FIELD_NAME));
    return {
      checkbox: checkbox ? normalizeField(checkbox) : null,
      adjustment: adjustment ? normalizeField(adjustment) : null
    };
  }

  function normalizeField(field) {
    return {
      key: field.key || field.Key || field.id || null,
      name: field.name || field.Name || null,
      uniqueName: field.uniqueName || field.UniqueName || null,
      placement: field.placement || field.Placement || [],
      type: field.type ?? field.Type ?? null,
      size: field.size ?? field.Size ?? null,
      locked: field.lockedForManualEditing ?? field.LockedForManualEditing ?? false,
      excludeFromCopying: field.excludeFromCopyingOrCloning ?? field.ExcludeFromCopyingOrCloning ?? false,
      description: field.description || field.Description || null,
      raw: field
    };
  }

  function placementStatus(field, docTypes) {
    const placement = Array.isArray(field?.placement) ? field.placement.map((x) => String(x).toLowerCase()) : [];
    const rows = (docTypes || DOC_TYPES).map((type) => ({
      ...type,
      placed: placement.includes(String(type.typeGuid).toLowerCase())
    }));
    return {
      placement,
      placed: rows.filter((row) => row.placed),
      unplaced: rows.filter((row) => !row.placed),
      lateFee: LATE_FEE_TYPE
    };
  }

  function extractUuid(href) {
    if (!href) return null;
    let text = String(href);
    try { text = decodeURIComponent(text); } catch (err) { /* keep original */ }
    let pathPart = text;
    let queryPart = '';
    const question = text.indexOf('?');
    if (question >= 0) {
      pathPart = text.slice(0, question);
      queryPart = text.slice(question + 1);
    }
    const pathUuids = pathPart.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g);
    if (pathUuids && pathUuids.length) return pathUuids[pathUuids.length - 1].toLowerCase();
    const queryMatch = queryPart.match(/(?:^|&)(?:Key|key|id)=([0-9a-fA-F-]{36})(?:&|$)/);
    if (queryMatch) return queryMatch[1].toLowerCase();
    const anyUuids = text.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g);
    return anyUuids && anyUuids.length ? anyUuids[anyUuids.length - 1].toLowerCase() : null;
  }

  function findLink(row) {
    if (!row) return null;
    const direct = row.link || row.Link;
    if (direct && (direct.href || direct.Href)) return { href: direct.href || direct.Href };
    const cells = Array.isArray(row.cells) ? row.cells : Array.isArray(row.Cells) ? row.Cells : [];
    for (const cell of cells) {
      const link = cell && (cell.link || cell.Link);
      if (link && (link.href || link.Href)) return { href: link.href || link.Href };
    }
    return null;
  }

  function rowCells(row) {
    if (!row) return [];
    if (Array.isArray(row.cells)) return row.cells;
    if (Array.isArray(row.Cells)) return row.Cells;
    return [];
  }

  function cellValue(cell) {
    if (cell && typeof cell === 'object') return cell.value ?? cell.Value;
    return cell;
  }

  function accountMatchKeys(account) {
    const keys = [];
    const code = account.code || '';
    const name = account.name || '';
    const nameWithCode = account.nameWithCode || '';
    [nameWithCode, name, code && name ? `${code} ${name}` : '', code && name ? `${code}${name}` : '', code, name && code ? `${name} ${code}` : '']
      .filter(Boolean)
      .forEach((value) => {
        keys.push(normalize(value));
        keys.push(compact(value));
      });
    return Array.from(new Set(keys.filter(Boolean)));
  }

  function buildAccountIndex(plAccounts, bsAccounts, options) {
    const groups = options?.groups || {};
    const accounts = [];
    const byKey = new Map();
    const byName = new Map();
    const ambiguousNames = new Set();

    function groupName(groupKey) {
      if (!groupKey) return 'Uncategorized';
      const group = groups[groupKey] || groups[String(groupKey).toLowerCase()];
      return group?.name || group?.Name || `Group ${String(groupKey).slice(0, 8)}`;
    }

    function add(raw, type) {
      const item = unwrapItem(raw) || {};
      const key = item.key || item.Key || item.id || raw?.key;
      if (!key) return;
      const name = item.name || item.Name || '';
      const code = item.code || item.Code || '';
      const nameWithCode = item.nameWithCode || item.NameWithCode || [code, name].filter(Boolean).join(' ');
      const account = {
        key: String(key),
        type,
        code: code ? String(code) : '',
        name: name ? String(name) : '',
        nameWithCode: nameWithCode ? String(nameWithCode) : '',
        groupKey: item.group || item.Group || null,
        groupName: groupName(item.group || item.Group || null),
        flags: {
          isProfitAndLossAccount: item.isProfitAndLossAccount ?? type === 'PL',
          isAccountsReceivable: !!item.isAccountsReceivable,
          isAccountsPayable: !!item.isAccountsPayable,
          isCashAtBank: !!item.isCashAtBank,
          isInventoryOnHand: !!item.isInventoryOnHand,
          isInterAccountTransfers: !!item.isInterAccountTransfers,
          isControlAccountForCapitalAccounts: !!item.isControlAccountForCapitalAccounts,
          isEmployeeClearingAccount: !!item.isEmployeeClearingAccount,
          isControlAccountForSpecialAccounts: !!item.isControlAccountForSpecialAccounts,
          isControlAccountForFixedAssets: !!item.isControlAccountForFixedAssets,
          isControlAccountForFixedAssetsAccumulatedDepreciation: !!item.isControlAccountForFixedAssetsAccumulatedDepreciation,
          isControlAccountForIntangibleAssets: !!item.isControlAccountForIntangibleAssets,
          isControlAccountForIntangibleAssetsAccumulatedAmortization: !!item.isControlAccountForIntangibleAssetsAccumulatedAmortization,
          isControlAccountForInvestments: !!item.isControlAccountForInvestments,
          isWithholdingTaxPayablePayable: !!item.isWithholdingTaxPayablePayable
        },
        raw: item
      };
      account.category = type === 'PL' ? plCategory(account) : bsCategory(account);
      accounts.push(account);
      byKey.set(account.key.toLowerCase(), account);
      for (const matchKey of accountMatchKeys(account)) {
        const existing = byName.get(matchKey);
        if (existing && existing.key !== account.key) {
          ambiguousNames.add(matchKey);
          byName.set(matchKey, null);
        } else if (!existing) {
          byName.set(matchKey, account);
        }
      }
    }

    (plAccounts || []).forEach((account) => add(account, 'PL'));
    (bsAccounts || []).forEach((account) => add(account, 'BS'));

    return {
      accounts,
      byKey,
      byName,
      ambiguousNames: Array.from(ambiguousNames),
      groups
    };
  }

  function resolveAccountByName(name, accountIndex, fallbackType) {
    if (!accountIndex) return null;
    const candidates = [normalize(name), compact(name)];
    for (const key of candidates) {
      const account = accountIndex.byName.get(key);
      if (account) return account;
    }
    return null;
  }

  function plCategory(account) {
    const text = normalize(`${account.groupName || ''} ${account.name || ''}`);
    if (/cost of (sales|goods)|cogs|direct cost/.test(text)) return 'costOfSales';
    if (/other income|non operating income/.test(text)) return 'otherIncome';
    if (/other expense|non operating expense/.test(text)) return 'otherExpenses';
    if (/income|revenue|sales|turnover|discount received/.test(text)) return 'income';
    return 'expenses';
  }

  function bsCategory(account) {
    if (account.flags.isControlAccountForCapitalAccounts) return 'equity';
    if (account.flags.isAccountsPayable || account.flags.isWithholdingTaxPayablePayable || account.flags.isEmployeeClearingAccount) return 'liability';
    const text = normalize(`${account.groupName || ''} ${account.name || ''}`);
    if (/equity|capital|retained|owner/.test(text)) return 'equity';
    if (/liabilit|payable|accrual|loan|borrowing|tax payable/.test(text)) return 'liability';
    if (/asset|receivable|cash|bank|inventory|fixed asset|investment|prepaid|deposit/.test(text)) return 'asset';
    if (account.flags.isAccountsReceivable || account.flags.isCashAtBank || account.flags.isInventoryOnHand || account.flags.isInterAccountTransfers || account.flags.isControlAccountForFixedAssets || account.flags.isControlAccountForFixedAssetsAccumulatedDepreciation || account.flags.isControlAccountForIntangibleAssets || account.flags.isControlAccountForIntangibleAssetsAccumulatedAmortization || account.flags.isControlAccountForInvestments) return 'asset';
    return 'asset';
  }

  function parseGlReport(model, accountIndex) {
    const rows = [];
    const groups = [];
    const syntheticRows = [];
    const unmatchedGroups = [];
    let section = 'PL';

    function processLeaf(row, group) {
      const link = findLink(row);
      const docKey = link ? extractUuid(link.href) : null;
      const cells = rowCells(row);
      const debit = num(cellValue(cells[0]));
      const credit = num(cellValue(cells[1]));
      const leaf = {
        name: row.name || row.Name || '',
        groupName: group?.name || '',
        accountKey: group?.account?.key || null,
        accountType: group?.account?.type || group?.fallbackType || null,
        accountName: group?.account?.nameWithCode || group?.name || '',
        docKey,
        href: link?.href || null,
        debit,
        credit,
        net: debit - credit,
        synthetic: !docKey
      };
      if (!docKey) {
        syntheticRows.push(leaf);
      } else {
        rows.push(leaf);
      }
    }

    const modelRows = Array.isArray(model?.rows) ? model.rows : Array.isArray(model?.Rows) ? model.Rows : [];
    for (const row of modelRows) {
      const childRows = Array.isArray(row.rows) ? row.rows : Array.isArray(row.Rows) ? row.Rows : null;
      const rowName = row.name || row.Name || '';
      if (childRows && childRows.length) {
        const account = resolveAccountByName(rowName, accountIndex, section);
        if (account && account.type === 'BS') section = 'BS';
        if (!account) {
          const name = rowName || 'Unnamed group';
          if (!unmatchedGroups.includes(name)) unmatchedGroups.push(name);
        }
        const group = {
          name: rowName,
          account,
          fallbackType: account ? account.type : section,
          children: childRows.length
        };
        groups.push(group);
        for (const child of childRows) processLeaf(child, group);
      } else {
        const isBold = row.isBold ?? row.IsBold;
        if (row && isBold && !childRows) {
          const text = normalize(rowName);
          if (/profit|loss|period|total|net/.test(text)) {
            if (section === 'PL' && /profit|loss|period|net/.test(text)) section = 'BS';
            const cells = rowCells(row);
            syntheticRows.push({
              name: rowName,
              groupName: '',
              accountKey: null,
              accountType: null,
              accountName: rowName,
              docKey: null,
              href: null,
              debit: num(cellValue(cells[0])),
              credit: num(cellValue(cells[1])),
              net: 0,
              synthetic: true
            });
          }
        }
      }
    }

    return { rows, groups, syntheticRows, unmatchedGroups };
  }

  function buildPartyIndex(customers, suppliers, employees, payers) {
    const byKey = new Map();
    function add(list) {
      (list || []).forEach((raw) => {
        const item = unwrapItem(raw) || {};
        const key = item.key || item.Key || raw?.key;
        if (!key) return;
        byKey.set(String(key).toLowerCase(), item.name || item.Name || item.nameWithCode || item.NameWithCode || String(key));
      });
    }
    add(customers);
    add(suppliers);
    add(employees);
    add(payers);
    return byKey;
  }

  function isForeignDocument(item, currencyKey, exchangeRate, baseCurrencyKey) {
    const base = baseCurrencyKey ? String(baseCurrencyKey).toLowerCase() : null;
    if (currencyKey && base && String(currencyKey).toLowerCase() === base) return false;
    if (currencyKey) return true;
    if (item && (item.exchangeRateIsInverse === true || item.ExchangeRateIsInverse === true)) return true;
    return Math.abs(exchangeRate) > 1e-9 && Math.abs(exchangeRate - 1) > 1e-9;
  }

  function buildDocumentIndex(rawByType, context) {
    const byKey = new Map();
    const byType = new Map();
    const docs = [];
    const duplicates = [];
    const missingDates = [];
    const types = context?.types || DOC_TYPES;
    const fbrFieldKey = context?.fbrFieldKey || null;
    const partyIndex = context?.partyIndex || new Map();
    const baseCurrencyKey = context?.baseCurrencyKey || null;

    for (const type of types) {
      const rawList = rawByType?.[type.key] || [];
      const list = [];
      for (const raw of rawList) {
        const item = unwrapItem(raw);
        if (!item) continue;
        const key = itemKey(raw) || item.key || item.Key;
        if (!key) continue;
        const date = firstDate(item, type.dateFields || ['date']);
        const reference = firstString(item, type.referenceFields || ['reference']);
        const partyKey = type.partyField ? fieldValue(item, type.partyField) : null;
        const party = partyKey ? (partyIndex.get(String(partyKey).toLowerCase()) || '') : '';
        const currencyKey = fieldValue(item, 'currency') || null;
        const exchangeRate = Number(fieldValue(item, 'exchangeRate') ?? 0) || 0;
        const isForeign = isForeignDocument(item, currencyKey, exchangeRate, baseCurrencyKey);
        const doc = {
          key: String(key).toLowerCase(),
          rawKey: String(key),
          type: type.key,
          typeLabel: type.label,
          date,
          reference,
          party,
          partyKey: partyKey || null,
          currencyKey,
          isForeign,
          fbr: type.customFields && fbrFieldKey ? readCheckbox(item, fbrFieldKey) : false,
          customFields: item.customFields || item.CustomFields || null,
          customFields2: item.customFields2 || item.CustomFields2 || null,
          linkedInvoiceKey: null,
          raw: item
        };
        if (!date) missingDates.push(doc);
        const existing = byKey.get(doc.key);
        if (existing) duplicates.push({ key: doc.key, first: existing.type, duplicate: doc.type });
        else byKey.set(doc.key, doc);
        list.push(doc);
        docs.push(doc);
      }
      byType.set(type.key, list);
    }

    return { byKey, byType, docs, duplicates, missingDates };
  }

  function attachLateFeeLinks(docIndex, lateFeeItems) {
    const fees = [];
    for (const raw of lateFeeItems || []) {
      const item = unwrapItem(raw);
      if (!item) continue;
      const key = itemKey(raw) || item.key || item.Key;
      if (!key) continue;
      const date = firstDate(item, LATE_FEE_TYPE.dateFields);
      const reference = firstString(item, LATE_FEE_TYPE.referenceFields);
      const invoiceKey = item.salesInvoice || item.SalesInvoice || null;
      const fee = {
        key: String(key).toLowerCase(),
        rawKey: String(key),
        type: LATE_FEE_TYPE.key,
        typeLabel: LATE_FEE_TYPE.label,
        date,
        reference,
        party: '',
        partyKey: item.customer || null,
        currencyKey: item.currency || null,
        isForeign: false,
        fbr: false,
        linkedInvoiceKey: invoiceKey ? String(invoiceKey).toLowerCase() : null,
        customFields: null,
        customFields2: null,
        raw: item,
        indirect: true
      };
      docIndex.byKey.set(fee.key, fee);
      fees.push(fee);
    }
    docIndex.byType.set(LATE_FEE_TYPE.key, fees);
    return fees;
  }

  function validateAdjustment(raw, accountIndex) {
    const errors = [];
    const warnings = [];
    const adj = raw && typeof raw === 'object' ? raw : {};
    if (adj.schemaVersion !== SCHEMA_VERSION) errors.push(`Unsupported schemaVersion: ${adj.schemaVersion}`);
    if (!adj.id) errors.push('Missing adjustment id');
    if (!['adjustment', 'opening', 'reversal'].includes(adj.type)) errors.push(`Invalid adjustment type: ${adj.type}`);
    const date = parseDateOnly(adj.date);
    if (!date) errors.push(`Invalid adjustment date: ${adj.date}`);
    if (!Array.isArray(adj.lines) || adj.lines.length === 0) errors.push('Adjustment has no lines');
    const lines = [];
    let debitTotal = 0;
    let creditTotal = 0;
    for (const [index, line] of (adj.lines || []).entries()) {
      const accountKey = line.accountKey || line.account;
      const account = accountIndex?.byKey?.get(String(accountKey || '').toLowerCase());
      if (!accountKey) errors.push(`Line ${index + 1}: missing accountKey`);
      if (accountKey && !account) warnings.push(`Line ${index + 1}: account ${accountKey} is not in the current chart of accounts`);
      const debit = round2(line.debit);
      const credit = round2(line.credit);
      if (debit < 0 || credit < 0) errors.push(`Line ${index + 1}: debit and credit must be positive`);
      if (debit > 0 && credit > 0) errors.push(`Line ${index + 1}: use either debit or credit, not both`);
      if (debit === 0 && credit === 0) errors.push(`Line ${index + 1}: amount is zero`);
      if (adj.type === 'opening' && account && account.type !== 'BS') errors.push(`Line ${index + 1}: opening adjustments may only use balance sheet accounts`);
      debitTotal += debit;
      creditTotal += credit;
      lines.push({
        accountKey: accountKey ? String(accountKey).toLowerCase() : null,
        accountType: account?.type || line.accountType || null,
        accountName: account?.nameWithCode || line.accountName || '',
        debit,
        credit,
        description: line.description || ''
      });
    }
    debitTotal = round2(debitTotal);
    creditTotal = round2(creditTotal);
    const difference = round2(debitTotal - creditTotal);
    if (adj.type !== 'opening' && Math.abs(difference) > 0.005) errors.push(`Adjustment is not balanced by ${money(difference)}`);
    if (adj.type === 'opening' && Math.abs(difference) > 0.005) warnings.push(`Opening adjustment will be balanced to ${SYNTHETIC.opening} by ${money(difference)}`);
    if (adj.type === 'reversal' && !adj.reverses) errors.push('Reversal is missing the reverses id');
    return {
      adjustment: {
        schemaVersion: SCHEMA_VERSION,
        id: adj.id || null,
        type: adj.type || null,
        date,
        description: adj.description || '',
        reason: adj.reason || '',
        reverses: adj.reverses || null,
        operator: adj.operator || 'unverified',
        lines,
        debitTotal,
        creditTotal,
        difference,
        folderKey: raw.folderKey || null,
        folderDescription: raw.folderDescription || null,
        raw: adj
      },
      errors,
      warnings
    };
  }

  function parseAdjustmentFolders(folders, fieldKey, accountIndex) {
    const adjustments = [];
    const invalid = [];
    for (const raw of folders || []) {
      const item = unwrapItem(raw) || {};
      const description = item.description || item.Description || '';
      const text = readTextField(item, fieldKey);
      if (!text) continue;
      if (description.startsWith(CONFIG_PREFIX)) continue;
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (err) {
        invalid.push({ folderKey: itemKey(raw), description, error: `Invalid JSON: ${err.message}` });
        continue;
      }
      parsed.folderKey = itemKey(raw);
      parsed.folderDescription = description;
      const validated = validateAdjustment(parsed, accountIndex);
      if (validated.errors.length) {
        invalid.push({ folderKey: itemKey(raw), description, error: validated.errors.join('; '), adjustment: validated.adjustment });
      } else {
        adjustments.push(validated.adjustment);
      }
    }
    const reversed = new Map();
    for (const adjustment of adjustments) {
      if (adjustment.type === 'reversal' && adjustment.reverses) reversed.set(adjustment.reverses, adjustment.id);
    }
    for (const adjustment of adjustments) {
      adjustment.reversedBy = reversed.get(adjustment.id) || null;
      adjustment.active = !adjustment.reversedBy;
    }
    return { adjustments, invalid };
  }

  function parseConfigFolder(folders, fieldKey) {
    const configs = [];
    for (const raw of folders || []) {
      const item = unwrapItem(raw) || {};
      const description = item.description || item.Description || '';
      if (!description.startsWith(CONFIG_PREFIX)) continue;
      const text = readTextField(item, fieldKey);
      if (!text) continue;
      try {
        const parsed = JSON.parse(text);
        const fbrStartDate = parseDateOnly(parsed.fbrStartDate);
        if (!fbrStartDate) continue;
        configs.push({
          schemaVersion: SCHEMA_VERSION,
          fbrStartDate,
          defaultPeriodFrom: parseDateOnly(parsed.defaultPeriodFrom) || fbrStartDate,
          defaultPeriodTo: parseDateOnly(parsed.defaultPeriodTo) || todayISO(),
          includeForeign: !!parsed.includeForeign,
          operator: parsed.operator || 'unverified',
          glReportKey: parsed.glReportKey ? String(parsed.glReportKey) : null,
          glRange: parsed.glRange && parseDateOnly(parsed.glRange.from) && parseDateOnly(parsed.glRange.to)
            ? { from: parseDateOnly(parsed.glRange.from), to: parseDateOnly(parsed.glRange.to) }
            : null,
          folderKey: itemKey(raw),
          folderDescription: description,
          updatedAt: parsed.updatedAt || null,
          folderTimestamp: item.timestamp || item.Timestamp || raw?.timestamp || raw?.Timestamp || 0,
          raw: parsed
        });
      } catch (err) {
        return { error: `Invalid FBR-CONFIG JSON: ${err.message}`, folderKey: itemKey(raw), folderDescription: description };
      }
    }
    if (!configs.length) return null;
    configs.sort((a, b) => {
      const aTime = a.updatedAt || '';
      const bTime = b.updatedAt || '';
      if (aTime !== bTime) return bTime.localeCompare(aTime);
      return Number(b.folderTimestamp || 0) - Number(a.folderTimestamp || 0);
    });
    return configs[0];
  }

  function defaultConfig() {
    const start = firstDayOfYear(todayISO());
    return {
      schemaVersion: SCHEMA_VERSION,
      fbrStartDate: start,
      defaultPeriodFrom: start,
      defaultPeriodTo: todayISO(),
      includeForeign: false,
      operator: 'unverified'
    };
  }

  function documentScope(doc, options) {
    if (!doc) return { include: false, reason: 'unknown-document' };
    if (!doc.date) return { include: false, reason: 'missing-date' };
    if (doc.date < options.fbrStartDate) return { include: false, reason: 'pre-start' };
    if (doc.date > options.periodTo) return { include: false, reason: 'after-period' };
    if (doc.isForeign && !options.includeForeign) return { include: false, reason: 'foreign' };
    if (doc.indirect) {
      const invoice = options.docIndex?.byKey?.get(doc.linkedInvoiceKey);
      if (!invoice) return { include: false, reason: 'missing-linked-invoice' };
      if (!invoice.fbr) return { include: false, reason: 'linked-invoice-untagged' };
      if (invoice.isForeign && !options.includeForeign) return { include: false, reason: 'foreign' };
      return { include: true, doc, via: invoice };
    }
    if (!doc.fbr) return { include: false, reason: 'untagged' };
    return { include: true, doc };
  }

  function bucket(map, account) {
    if (!account) return null;
    let value = map.get(account.key);
    if (!value) {
      value = {
        account,
        debit: 0,
        credit: 0,
        net: 0,
        glDebit: 0,
        glCredit: 0,
        adjDebit: 0,
        adjCredit: 0,
        rows: 0
      };
      map.set(account.key, value);
    }
    return value;
  }

  function addAmount(target, debit, credit, source) {
    if (!target) return;
    target.debit += debit;
    target.credit += credit;
    target.net += debit - credit;
    if (source === 'gl') {
      target.glDebit += debit;
      target.glCredit += credit;
      target.rows += 1;
    } else {
      target.adjDebit += debit;
      target.adjCredit += credit;
    }
  }

  function adjustmentLinesInScope(adjustments, options) {
    const rows = [];
    const errors = [];
    const warnings = [];
    for (const adjustment of adjustments || []) {
      if (!adjustment.date || adjustment.date < options.fbrStartDate || adjustment.date > options.periodTo) {
        warnings.push(`Adjustment ${adjustment.id} is outside the FBR date range and was skipped`);
        continue;
      }
      let debitTotal = 0;
      let creditTotal = 0;
      for (const line of adjustment.lines || []) {
        debitTotal += line.debit;
        creditTotal += line.credit;
        rows.push({
          adjustmentId: adjustment.id,
          adjustmentType: adjustment.type,
          date: adjustment.date,
          accountKey: line.accountKey,
          accountType: line.accountType,
          accountName: line.accountName,
          debit: line.debit,
          credit: line.credit,
          description: line.description,
          reversedBy: adjustment.reversedBy || null
        });
      }
      if (adjustment.type === 'opening') {
        const difference = round2(debitTotal - creditTotal);
        if (Math.abs(difference) > 0.005) {
          rows.push({
            adjustmentId: adjustment.id,
            adjustmentType: 'opening-balance',
            date: adjustment.date,
            accountKey: SYNTHETIC.opening,
            accountType: 'BS',
            accountName: SYNTHETIC.opening,
            debit: difference < 0 ? Math.abs(difference) : 0,
            credit: difference > 0 ? difference : 0,
            description: 'Opening balancing equity',
            reversedBy: adjustment.reversedBy || null
          });
        }
      } else if (Math.abs(round2(debitTotal - creditTotal)) > 0.005) {
        errors.push(`Adjustment ${adjustment.id} is not balanced by ${money(debitTotal - creditTotal)}`);
      }
    }
    return { rows, errors, warnings };
  }

  function computeReports(input) {
    const accountIndex = input.accountIndex;
    const docIndex = input.docIndex;
    const options = {
      fbrStartDate: parseDateOnly(input.options?.fbrStartDate) || defaultConfig().fbrStartDate,
      periodFrom: parseDateOnly(input.options?.periodFrom) || parseDateOnly(input.options?.fbrStartDate) || defaultConfig().fbrStartDate,
      periodTo: parseDateOnly(input.options?.periodTo) || todayISO(),
      includeForeign: !!input.options?.includeForeign,
      docIndex
    };
    if (options.periodFrom < options.fbrStartDate) options.periodFrom = options.fbrStartDate;
    if (options.periodTo < options.periodFrom) options.periodTo = options.periodFrom;

    const gl = parseGlReport(input.glModel, accountIndex);
    const adjustmentScope = adjustmentLinesInScope(input.adjustments || [], options);
    const warnings = [];
    const errors = [];
    const excluded = {
      untagged: [],
      foreign: [],
      preStart: [],
      afterPeriod: [],
      missingDate: [],
      unknownDocument: [],
      linkedInvoiceUntagged: [],
      missingLinkedInvoice: []
    };

    const tbBuckets = new Map();
    const plBuckets = new Map();
    const bsBuckets = new Map();
    const includedRows = [];
    const includedDocs = new Map();
    const unknownRows = [];
    let priorPl = 0;
    let currentPl = 0;

    for (const row of gl.rows) {
      const doc = docIndex?.byKey?.get(row.docKey);
      const scope = documentScope(doc, options);
      if (!scope.include) {
        if (scope.reason === 'untagged') excluded.untagged.push(row);
        else if (scope.reason === 'foreign') excluded.foreign.push(row);
        else if (scope.reason === 'pre-start') excluded.preStart.push(row);
        else if (scope.reason === 'after-period') excluded.afterPeriod.push(row);
        else if (scope.reason === 'missing-date') excluded.missingDate.push(row);
        else if (scope.reason === 'linked-invoice-untagged') excluded.linkedInvoiceUntagged.push(row);
        else if (scope.reason === 'missing-linked-invoice') excluded.missingLinkedInvoice.push(row);
        else {
          excluded.unknownDocument.push(row);
          unknownRows.push(row);
        }
        continue;
      }
      const account = row.accountKey ? accountIndex?.byKey?.get(String(row.accountKey).toLowerCase()) : null;
      const effectiveAccount = account || {
        key: row.accountKey || `UNMAPPED:${row.groupName}`,
        type: row.accountType || 'BS',
        code: '',
        name: row.accountName || row.groupName,
        nameWithCode: row.accountName || row.groupName,
        category: row.accountType === 'PL' ? plCategory({ groupName: row.groupName, name: row.accountName }) : bsCategory({ groupName: row.groupName, name: row.accountName, flags: {} }),
        synthetic: true,
        groupName: row.groupName
      };
      const enriched = {
        ...row,
        accountKey: effectiveAccount.key,
        accountType: effectiveAccount.type,
        accountName: effectiveAccount.nameWithCode,
        docKey: scope.doc.key,
        docType: scope.doc.type,
        docTypeLabel: scope.doc.typeLabel,
        docDate: scope.doc.date,
        docReference: scope.doc.reference,
        viaInvoice: scope.via ? scope.via.key : null
      };
      includedRows.push(enriched);
      includedDocs.set(scope.doc.key, scope.doc);
      addAmount(bucket(tbBuckets, effectiveAccount), row.debit, row.credit, 'gl');
      if (effectiveAccount.type === 'PL') {
        if (scope.doc.date < options.periodFrom) priorPl += row.net;
        else currentPl += row.net;
        if (isDateInRange(scope.doc.date, options.periodFrom, options.periodTo)) {
          addAmount(bucket(plBuckets, effectiveAccount), row.debit, row.credit, 'gl');
        }
      }
      if (effectiveAccount.type === 'BS') {
        addAmount(bucket(bsBuckets, effectiveAccount), row.debit, row.credit, 'gl');
      }
    }

    for (const line of adjustmentScope.rows) {
      let account = accountIndex?.byKey?.get(String(line.accountKey || '').toLowerCase());
      if (!account && line.accountKey === SYNTHETIC.opening) {
        account = {
          key: SYNTHETIC.opening,
          type: 'BS',
          code: '',
          name: SYNTHETIC.opening,
          nameWithCode: SYNTHETIC.opening,
          category: 'equity',
          synthetic: true,
          groupName: 'Equity'
        };
      }
      if (!account) {
        warnings.push(`Adjustment ${line.adjustmentId}: account ${line.accountKey} was not found and is shown as unmapped`);
        account = {
          key: line.accountKey || `${SYNTHETIC.unmapped}:${line.accountName}`,
          type: line.accountType || 'BS',
          code: '',
          name: line.accountName || line.accountKey || SYNTHETIC.unmapped,
          nameWithCode: line.accountName || line.accountKey || SYNTHETIC.unmapped,
          category: line.accountType === 'PL' ? plCategory({ groupName: '', name: line.accountName || '' }) : 'asset',
          synthetic: true,
          groupName: line.accountType === 'PL' ? 'Unmapped' : 'Unmapped'
        };
      }
      addAmount(bucket(tbBuckets, account), line.debit, line.credit, 'adj');
      if (account.type === 'PL') {
        const net = line.debit - line.credit;
        if (line.date < options.periodFrom) priorPl += net;
        else currentPl += net;
        if (isDateInRange(line.date, options.periodFrom, options.periodTo)) {
          addAmount(bucket(plBuckets, account), line.debit, line.credit, 'adj');
        }
      }
      if (account.type === 'BS') {
        addAmount(bucket(bsBuckets, account), line.debit, line.credit, 'adj');
      }
    }

    const plRows = Array.from(plBuckets.values()).sort(sortAccount);
    const bsRows = Array.from(bsBuckets.values()).sort(sortAccount);
    const tbRows = Array.from(tbBuckets.values()).sort(sortAccount);

    priorPl = round2(priorPl);
    currentPl = round2(currentPl);
    const cumulativePl = round2(priorPl + currentPl);
    const syntheticEquity = [
      syntheticEquityRow(SYNTHETIC.retained, priorPl, 'FBR retained earnings before the selected period'),
      syntheticEquityRow(SYNTHETIC.current, currentPl, 'FBR result for the selected period')
    ].filter((row) => Math.abs(row.net) > 0.005);

    const bsRowsWithEquity = bsRows.concat(syntheticEquity).sort(sortAccount);
    const trialBalance = buildTrialBalance(tbRows, options);
    const profitAndLoss = buildProfitAndLoss(plRows, options);
    const balanceSheet = buildBalanceSheet(bsRowsWithEquity, options);
    const recon = buildReconciliation({
      gl,
      includedRows,
      excluded,
      tbRows,
      trialBalance,
      profitAndLoss,
      balanceSheet,
      adjustmentScope,
      adjustments: input.adjustments || [],
      includedDocs,
      options
    });

    return {
      ok: !recon.checks.some((check) => check.status === 'fail') && errors.length === 0 && adjustmentScope.errors.length === 0,
      errors: errors.concat(adjustmentScope.errors),
      warnings: warnings.concat(adjustmentScope.warnings),
      meta: {
        fbrStartDate: options.fbrStartDate,
        periodFrom: options.periodFrom,
        periodTo: options.periodTo,
        includeForeign: options.includeForeign,
        generatedAt: new Date().toISOString()
      },
      gl,
      included: {
        rows: includedRows,
        documents: Array.from(includedDocs.values()).sort((a, b) => String(a.date).localeCompare(String(b.date))),
        debit: round2(includedRows.reduce((sum, row) => sum + row.debit, 0)),
        credit: round2(includedRows.reduce((sum, row) => sum + row.credit, 0))
      },
      excluded,
      adjustments: {
        rows: adjustmentScope.rows,
        priorPl: round2(priorPl),
        currentPl: round2(currentPl),
        cumulativePl: round2(cumulativePl)
      },
      trialBalance,
      profitAndLoss,
      balanceSheet,
      reconciliation: recon
    };
  }

  function sortAccount(a, b) {
    const ac = a.account || a;
    const bc = b.account || b;
    return String(ac.nameWithCode || ac.name || '').localeCompare(String(bc.nameWithCode || bc.name || ''), undefined, { numeric: true });
  }

  function syntheticEquityRow(key, net, description) {
    return {
      account: {
        key,
        type: 'BS',
        code: '',
        name: key,
        nameWithCode: key,
        category: 'equity',
        synthetic: true,
        groupName: 'Equity'
      },
      debit: net > 0 ? net : 0,
      credit: net < 0 ? -net : 0,
      net,
      glDebit: 0,
      glCredit: 0,
      adjDebit: 0,
      adjCredit: 0,
      rows: 0,
      description,
      synthetic: true
    };
  }

  function buildTrialBalance(bucketRows, options) {
    const rows = bucketRows.map((bucketRow) => ({
      key: bucketRow.account.key,
      code: bucketRow.account.code,
      name: bucketRow.account.name,
      nameWithCode: bucketRow.account.nameWithCode,
      type: bucketRow.account.type,
      category: bucketRow.account.category,
      debit: round2(bucketRow.debit),
      credit: round2(bucketRow.credit),
      net: round2(bucketRow.net),
      glDebit: round2(bucketRow.glDebit),
      glCredit: round2(bucketRow.glCredit),
      adjDebit: round2(bucketRow.adjDebit),
      adjCredit: round2(bucketRow.adjCredit),
      synthetic: !!bucketRow.account.synthetic
    })).filter((row) => Math.abs(row.debit) > 0.005 || Math.abs(row.credit) > 0.005);
    const debit = round2(rows.reduce((sum, row) => sum + row.debit, 0));
    const credit = round2(rows.reduce((sum, row) => sum + row.credit, 0));
    return {
      rows,
      sections: [
        { id: 'PL', label: 'Profit & Loss', rows: rows.filter((row) => row.type === 'PL') },
        { id: 'BS', label: 'Balance Sheet', rows: rows.filter((row) => row.type === 'BS') }
      ],
      totals: {
        debit,
        credit,
        difference: round2(debit - credit)
      },
      meta: {
        basis: 'P&L since FBR start; balance sheet since FBR start',
        fbrStartDate: options.fbrStartDate,
        periodTo: options.periodTo
      }
    };
  }

  function buildProfitAndLoss(bucketRows, options) {
    const rows = bucketRows.map((bucketRow) => ({
      key: bucketRow.account.key,
      code: bucketRow.account.code,
      name: bucketRow.account.name,
      nameWithCode: bucketRow.account.nameWithCode,
      category: bucketRow.account.category,
      debit: round2(bucketRow.debit),
      credit: round2(bucketRow.credit),
      net: round2(bucketRow.net),
      amount: round2(bucketRow.account.category === 'income' || bucketRow.account.category === 'otherIncome' ? -bucketRow.net : bucketRow.net)
    })).filter((row) => Math.abs(row.amount) > 0.005);
    const sections = PL_SECTIONS.map((section) => ({
      ...section,
      rows: rows.filter((row) => row.category === section.id),
      total: round2(rows.filter((row) => row.category === section.id).reduce((sum, row) => sum + row.amount, 0))
    }));
    const income = sections.find((section) => section.id === 'income')?.total || 0;
    const costOfSales = sections.find((section) => section.id === 'costOfSales')?.total || 0;
    const expenses = sections.find((section) => section.id === 'expenses')?.total || 0;
    const otherIncome = sections.find((section) => section.id === 'otherIncome')?.total || 0;
    const otherExpenses = sections.find((section) => section.id === 'otherExpenses')?.total || 0;
    const grossProfit = round2(income - costOfSales);
    const netProfit = round2(grossProfit - expenses + otherIncome - otherExpenses);
    return {
      rows,
      sections,
      totals: {
        income: round2(income),
        costOfSales: round2(costOfSales),
        grossProfit,
        expenses: round2(expenses),
        otherIncome: round2(otherIncome),
        otherExpenses: round2(otherExpenses),
        netProfit
      },
      meta: {
        periodFrom: options.periodFrom,
        periodTo: options.periodTo
      }
    };
  }

  function buildBalanceSheet(bucketRows, options) {
    const rows = bucketRows.map((bucketRow) => ({
      key: bucketRow.account.key,
      code: bucketRow.account.code,
      name: bucketRow.account.name,
      nameWithCode: bucketRow.account.nameWithCode,
      category: bucketRow.account.category,
      debit: round2(bucketRow.debit),
      credit: round2(bucketRow.credit),
      net: round2(bucketRow.net),
      amount: round2(bucketRow.account.category === 'asset' ? bucketRow.net : -bucketRow.net),
      synthetic: !!bucketRow.account.synthetic,
      description: bucketRow.description || ''
    })).filter((row) => Math.abs(row.amount) > 0.005 || row.synthetic);
    const sections = BS_SECTIONS.map((section) => ({
      ...section,
      rows: rows.filter((row) => row.category === section.id),
      total: round2(rows.filter((row) => row.category === section.id).reduce((sum, row) => sum + row.amount, 0))
    }));
    const assets = sections.find((section) => section.id === 'asset')?.total || 0;
    const liabilities = sections.find((section) => section.id === 'liability')?.total || 0;
    const equity = sections.find((section) => section.id === 'equity')?.total || 0;
    return {
      rows,
      sections,
      totals: {
        assets: round2(assets),
        liabilities: round2(liabilities),
        equity: round2(equity),
        liabilitiesAndEquity: round2(liabilities + equity),
        difference: round2(assets - liabilities - equity)
      },
      meta: {
        asOf: options.periodTo,
        fbrStartDate: options.fbrStartDate
      }
    };
  }

  function buildReconciliation(input) {
    const tb = input.trialBalance;
    const pl = input.profitAndLoss;
    const bs = input.balanceSheet;
    const adjustmentDebit = round2((input.adjustmentScope.rows || []).reduce((sum, row) => sum + row.debit, 0));
    const adjustmentCredit = round2((input.adjustmentScope.rows || []).reduce((sum, row) => sum + row.credit, 0));
    const glDebit = round2((input.includedRows || []).reduce((sum, row) => sum + row.debit, 0));
    const glCredit = round2((input.includedRows || []).reduce((sum, row) => sum + row.credit, 0));
    const checks = [];
    function check(id, label, status, detail) {
      checks.push({ id, label, status, detail });
    }
    check('gl-balanced', 'Included GL rows balance', Math.abs(glDebit - glCredit) < 0.005 ? 'pass' : 'fail', `Debit ${money(glDebit)} / Credit ${money(glCredit)}`);
    check('adjustments-balanced', 'Adjustments balance', Math.abs(adjustmentDebit - adjustmentCredit) < 0.005 ? 'pass' : 'fail', `Debit ${money(adjustmentDebit)} / Credit ${money(adjustmentCredit)}`);
    check('trial-balance', 'Trial balance balances', Math.abs(tb.totals.difference) < 0.005 ? 'pass' : 'fail', `Difference ${money(tb.totals.difference)}`);
    check('balance-sheet', 'Balance sheet balances', Math.abs(bs.totals.difference) < 0.005 ? 'pass' : 'fail', `Assets ${money(bs.totals.assets)} / Liabilities + Equity ${money(bs.totals.liabilitiesAndEquity)}`);
    check('unknown-links', 'All linked rows resolve to a document', input.excluded.unknownDocument.length === 0 ? 'pass' : 'warn', `${input.excluded.unknownDocument.length} unresolved row(s)`);
    check('unmapped-accounts', 'All GL rows resolve to an account', input.gl.unmatchedGroups.length === 0 ? 'pass' : 'warn', `${input.gl.unmatchedGroups.length} unmatched group(s)`);
    check('foreign', 'Foreign-currency documents excluded', input.excluded.foreign.length === 0 ? 'pass' : 'warn', `${input.excluded.foreign.length} foreign row(s) excluded`);
    check('untagged', 'Untagged documents excluded', input.excluded.untagged.length === 0 ? 'pass' : 'warn', `${input.excluded.untagged.length} untagged row(s) excluded`);
    check('adjustment-errors', 'Adjustments valid', (input.adjustmentScope.errors || []).length === 0 ? 'pass' : 'fail', `${(input.adjustmentScope.errors || []).length} error(s)`);
    return {
      glDebit,
      glCredit,
      glNet: round2(glDebit - glCredit),
      adjustmentDebit,
      adjustmentCredit,
      adjustmentNet: round2(adjustmentDebit - adjustmentCredit),
      trialBalanceDebit: tb.totals.debit,
      trialBalanceCredit: tb.totals.credit,
      trialBalanceDifference: tb.totals.difference,
      profitAndLossNet: pl.totals.netProfit,
      balanceSheetAssets: bs.totals.assets,
      balanceSheetLiabilities: bs.totals.liabilities,
      balanceSheetEquity: bs.totals.equity,
      balanceSheetDifference: bs.totals.difference,
      documentCount: input.includedDocs.size,
      includedRowCount: input.includedRows.length,
      excluded: {
        untagged: input.excluded.untagged.length,
        foreign: input.excluded.foreign.length,
        preStart: input.excluded.preStart.length,
        afterPeriod: input.excluded.afterPeriod.length,
        missingDate: input.excluded.missingDate.length,
        unknownDocument: input.excluded.unknownDocument.length,
        linkedInvoiceUntagged: input.excluded.linkedInvoiceUntagged.length,
        missingLinkedInvoice: input.excluded.missingLinkedInvoice.length
      },
      checks
    };
  }

  function makeAdjustmentId(prefix, sequence) {
    const cleanPrefix = String(prefix || 'ADJ').toUpperCase().replace(/[^A-Z0-9-]/g, '');
    return `${cleanPrefix}-${String(sequence).padStart(6, '0')}`;
  }

  function nextAdjustmentId(adjustments, prefix) {
    let max = 0;
    for (const adjustment of adjustments || []) {
      const id = String(adjustment.id || '');
      const match = id.match(/(\d+)$/);
      if (match) max = Math.max(max, Number(match[1]));
    }
    return makeAdjustmentId(prefix, max + 1);
  }

  function buildAdjustment(input) {
    const adj = {
      schemaVersion: SCHEMA_VERSION,
      id: input.id,
      type: input.type,
      date: parseDateOnly(input.date),
      description: input.description || '',
      reason: input.reason || '',
      reverses: input.reverses || null,
      operator: input.operator || 'unverified',
      lines: (input.lines || []).map((line) => ({
        accountKey: line.accountKey,
        accountName: line.accountName || '',
        debit: round2(line.debit),
        credit: round2(line.credit),
        description: line.description || ''
      })),
      createdAt: new Date().toISOString()
    };
    return adj;
  }

  function adjustmentFolderDescription(adjustment) {
    const suffix = adjustment.description ? ` - ${adjustment.description}` : '';
    return `${FOLDER_PREFIX}${adjustment.id}${suffix}`;
  }

  function configFolderDescription() {
    return CONFIG_PREFIX;
  }

  function folderPostBody(description, value, fieldKey) {
    return {
      Description: description,
      CustomFields2: {
        Strings: {
          [fieldKey]: JSON.stringify(value)
        }
      }
    };
  }

  function adjustmentFolderBody(adjustment, fieldKey) {
    return folderPostBody(adjustmentFolderDescription(adjustment), adjustment, fieldKey);
  }

  function configFolderBody(config, fieldKey) {
    return folderPostBody(configFolderDescription(), config, fieldKey);
  }

  function buildConfig(input) {
    return {
      schemaVersion: SCHEMA_VERSION,
      fbrStartDate: parseDateOnly(input.fbrStartDate),
      defaultPeriodFrom: parseDateOnly(input.defaultPeriodFrom) || parseDateOnly(input.fbrStartDate),
      defaultPeriodTo: parseDateOnly(input.defaultPeriodTo) || todayISO(),
      includeForeign: !!input.includeForeign,
      operator: input.operator || 'unverified',
      glReportKey: input.glReportKey ? String(input.glReportKey) : null,
      glRange: input.glRange && parseDateOnly(input.glRange.from) && parseDateOnly(input.glRange.to)
        ? { from: parseDateOnly(input.glRange.from), to: parseDateOnly(input.glRange.to) }
        : null,
      updatedAt: new Date().toISOString()
    };
  }

  function csvEscape(value) {
    const text = String(value === null || value === undefined ? '' : value);
    if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  }

  function toCsv(rows, columns) {
    const header = columns.map((column) => csvEscape(column.label)).join(',');
    const body = (rows || []).map((row) => columns.map((column) => csvEscape(typeof column.value === 'function' ? column.value(row) : row[column.value])).join(',')).join('\r\n');
    return `${header}\r\n${body}`;
  }

  function reportCsv(report) {
    const rows = [];
    for (const section of report.profitAndLoss.sections) {
      for (const row of section.rows) rows.push({ section: section.label, code: row.code, account: row.nameWithCode, amount: row.amount });
    }
    rows.push({ section: 'Total', code: '', account: 'Net profit', amount: report.profitAndLoss.totals.netProfit });
    return toCsv(rows, [
      { label: 'Section', value: 'section' },
      { label: 'Code', value: 'code' },
      { label: 'Account', value: 'account' },
      { label: 'Amount', value: (row) => money(row.amount) }
    ]);
  }

  function trialBalanceCsv(report) {
    return toCsv(report.trialBalance.rows, [
      { label: 'Code', value: 'code' },
      { label: 'Account', value: 'nameWithCode' },
      { label: 'Type', value: 'type' },
      { label: 'Debit', value: (row) => money(row.debit) },
      { label: 'Credit', value: (row) => money(row.credit) },
      { label: 'Net', value: (row) => money(row.net) }
    ]);
  }

  function balanceSheetCsv(report) {
    const rows = [];
    for (const section of report.balanceSheet.sections) {
      for (const row of section.rows) rows.push({ section: section.label, code: row.code, account: row.nameWithCode, amount: row.amount });
    }
    return toCsv(rows, [
      { label: 'Section', value: 'section' },
      { label: 'Code', value: 'code' },
      { label: 'Account', value: 'account' },
      { label: 'Amount', value: (row) => money(row.amount) }
    ]);
  }

  return {
    SCHEMA_VERSION,
    FBR_FIELD_NAME,
    ADJUSTMENT_FIELD_NAME,
    FOLDER_PREFIX,
    CONFIG_PREFIX,
    SYNTHETIC,
    DOC_TYPES,
    LATE_FEE_TYPE,
    PL_SECTIONS,
    BS_SECTIONS,
    num,
    round2,
    money,
    normalize,
    compact,
    parseDateOnly,
    todayISO,
    firstDayOfYear,
    isDateInRange,
    unwrapItem,
    itemKey,
    readCheckbox,
    readTextField,
    detectFbrFields,
    normalizeField,
    placementStatus,
    extractUuid,
    findLink,
    buildAccountIndex,
    resolveAccountByName,
    plCategory,
    bsCategory,
    parseGlReport,
    buildPartyIndex,
    buildDocumentIndex,
    attachLateFeeLinks,
    validateAdjustment,
    parseAdjustmentFolders,
    parseConfigFolder,
    defaultConfig,
    documentScope,
    computeReports,
    makeAdjustmentId,
    nextAdjustmentId,
    buildAdjustment,
    adjustmentFolderDescription,
    configFolderDescription,
    folderPostBody,
    adjustmentFolderBody,
    configFolderBody,
    buildConfig,
    toCsv,
    reportCsv,
    trialBalanceCsv,
    balanceSheetCsv
  };
});
