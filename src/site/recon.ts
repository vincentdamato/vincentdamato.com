// Reconciliation logic for the homepage demo. All data here is made up.

export type Txn = { id: string; day: number; amount: number; text: string };

export const BANK: Txn[] = [
  { id: "b1", day: 1, amount: -1240.0, text: "ACH ULINE 4471" },
  { id: "b2", day: 2, amount: 8615.5, text: "DEPOSIT" },
  { id: "b3", day: 6, amount: -312.18, text: "CHECK 1093" },
  { id: "b4", day: 7, amount: -2950.0, text: "ACH RENT OCT" },
  { id: "b5", day: 9, amount: 4100.0, text: "DEPOSIT" },
  { id: "b6", day: 14, amount: -87.4, text: "CARD FEE" },
  { id: "b7", day: 15, amount: -1506.25, text: "ACH PAYROLL" },
  { id: "b8", day: 20, amount: -640.0, text: "CHECK 1097" },
  { id: "b9", day: 23, amount: 2275.0, text: "DEPOSIT" },
  { id: "b10", day: 23, amount: 2275.0, text: "DEPOSIT" },
];

export const BOOKS: Txn[] = [
  { id: "g1", day: 1, amount: -1240.0, text: "Uline supplies, ref 4471" },
  { id: "g2", day: 2, amount: 8615.5, text: "Customer receipts" },
  { id: "g3", day: 3, amount: -312.18, text: "Check 1093, utilities" },
  { id: "g4", day: 7, amount: -2950.0, text: "October rent" },
  { id: "g5", day: 8, amount: 4100.0, text: "Customer receipts" },
  { id: "g7", day: 15, amount: -1560.25, text: "Payroll" },
  { id: "g8", day: 16, amount: -640.0, text: "Check 1097, insurance" },
  { id: "g9", day: 23, amount: 2275.0, text: "Customer receipts" },
  { id: "g11", day: 30, amount: -415.0, text: "Check 1102, repairs" },
];

export type Status = "Matched" | "Amount differs" | "Possible duplicate" | "Not in books" | "Not cleared";

export type ReconRow = {
  key: string;
  bank?: Txn;
  book?: Txn;
  status: Status;
  /** Bank minus books for this row. Rows that fully match are zero. */
  delta: number;
};

export type ReconResult = {
  rows: ReconRow[];
  matched: number;
  review: number;
  bankTotal: number;
  bookTotal: number;
  difference: number;
  explained: number;
};

const NEAR_AMOUNT = 100; // A payroll-style keying error, not a different payment.
const cents = (n: number) => Math.round(n * 100) / 100;

export function reconcile(bank: Txn[], books: Txn[], toleranceDays: number): ReconResult {
  const usedBook = new Set<string>();
  const rows: ReconRow[] = [];
  const matchedBank: Txn[] = [];
  const open: Txn[] = [];

  for (const b of bank) {
    const hit = books.find(
      (g) => !usedBook.has(g.id) && g.amount === b.amount && Math.abs(g.day - b.day) <= toleranceDays,
    );
    if (hit) {
      usedBook.add(hit.id);
      matchedBank.push(b);
      rows.push({ key: b.id, bank: b, book: hit, status: "Matched", delta: 0 });
    } else {
      open.push(b);
    }
  }

  for (const b of open) {
    const near = books.find(
      (g) =>
        !usedBook.has(g.id) &&
        Math.abs(g.amount - b.amount) <= NEAR_AMOUNT &&
        Math.sign(g.amount) === Math.sign(b.amount) &&
        Math.abs(g.day - b.day) <= toleranceDays,
    );
    if (near) {
      usedBook.add(near.id);
      rows.push({ key: b.id, bank: b, book: near, status: "Amount differs", delta: cents(b.amount - near.amount) });
      continue;
    }
    const twin = matchedBank.some((m) => m.amount === b.amount && m.day === b.day);
    rows.push({ key: b.id, bank: b, status: twin ? "Possible duplicate" : "Not in books", delta: b.amount });
  }

  for (const g of books) {
    if (!usedBook.has(g.id)) rows.push({ key: g.id, book: g, status: "Not cleared", delta: -g.amount });
  }

  const dayOf = (r: ReconRow) => r.bank?.day ?? r.book?.day ?? 0;
  rows.sort((a, b) => Number(a.status === "Matched") - Number(b.status === "Matched") || dayOf(a) - dayOf(b));

  const bankTotal = cents(bank.reduce((s, t) => s + t.amount, 0));
  const bookTotal = cents(books.reduce((s, t) => s + t.amount, 0));
  const explained = cents(rows.reduce((s, r) => s + r.delta, 0));
  const matched = rows.filter((r) => r.status === "Matched").length;

  return {
    rows,
    matched,
    review: rows.length - matched,
    bankTotal,
    bookTotal,
    difference: cents(bankTotal - bookTotal),
    explained,
  };
}
