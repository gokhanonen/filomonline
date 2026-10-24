import { statementTotals, withRunningBalance } from "./statement.util";

const row = (date: string, debit: number, credit: number) => ({
  id: date,
  date,
  type: "EXPENSE" as const,
  documentNo: null,
  description: "",
  vehiclePlate: null,
  debit,
  credit,
  link: null,
});

describe("withRunningBalance", () => {
  it("tarihe göre sıralar ve yürüyen bakiyeyi hesaplar", () => {
    const out = withRunningBalance([
      row("2026-03-01", 0, 500),
      row("2026-01-01", 1000, 0),
      row("2026-02-01", 0, 250.5),
    ]);
    expect(out.map((r) => r.date)).toEqual(["2026-01-01", "2026-02-01", "2026-03-01"]);
    expect(out.map((r) => r.balance)).toEqual([1000, 749.5, 249.5]);
  });
  it("boş liste için boş döner", () => {
    expect(withRunningBalance([])).toEqual([]);
  });
});

describe("statementTotals", () => {
  it("borç/alacak toplamları ve net bakiye", () => {
    expect(statementTotals([row("a", 100, 0), row("b", 0, 30.25)])).toEqual({
      debit: 100,
      credit: 30.25,
      balance: 69.75,
    });
  });
});
