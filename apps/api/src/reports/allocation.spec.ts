import { buildSegments, computeAllocatedExpenses, inclusiveDays } from "./allocation";

const d = (s: string) => new Date(s + "T00:00:00");
const today = d("2026-03-31");

describe("inclusiveDays", () => {
  it("aynı gün 1, 12→25 14 gün", () => {
    expect(inclusiveDays(d("2026-01-12"), d("2026-01-12"))).toBe(1);
    expect(inclusiveDays(d("2026-01-12"), d("2026-01-25"))).toBe(14);
  });
});

describe("buildSegments", () => {
  it("ilk atama alış tarihinden geçerli; taşınma günü yeni lokasyona yazılır", () => {
    const segs = buildSegments(
      { id: "v", status: "STOKTA", purchaseDate: d("2026-01-01"), saleDate: null },
      [
        { vehicleId: "v", fromLocationId: null, toLocationId: "A", status: "CONFIRMED", confirmedAt: d("2026-01-05") },
        { vehicleId: "v", fromLocationId: "A", toLocationId: "B", status: "CONFIRMED", confirmedAt: d("2026-01-11") },
      ],
      d("2026-01-20"),
    );
    expect(segs).toEqual([
      { locationId: "A", from: d("2026-01-01"), to: d("2026-01-10") },
      { locationId: "B", from: d("2026-01-11"), to: d("2026-01-20") },
    ]);
  });
  it("ilk atama yoksa ilk taşınmanın from'u, o da yoksa purchaseLocationId", () => {
    const a = buildSegments(
      { id: "v", status: "STOKTA", purchaseDate: d("2026-01-01"), saleDate: null, purchaseLocationId: "P" },
      [],
      d("2026-01-03"),
    );
    expect(a[0].locationId).toBe("P");
  });
  it("satılan araçta dönem satış tarihinde biter", () => {
    const segs = buildSegments(
      { id: "v", status: "SATILDI", purchaseDate: d("2026-01-01"), saleDate: d("2026-01-10"), purchaseLocationId: "P" },
      [],
      today,
    );
    expect(segs[0].to).toEqual(d("2026-01-10"));
  });
});

describe("computeAllocatedExpenses", () => {
  it("lokasyon masrafını o ay oradaki araçlara gün oranıyla dağıtır", () => {
    const vehicles = [
      { id: "v1", status: "STOKTA", purchaseDate: d("2026-01-01"), saleDate: null, purchaseLocationId: "A" },
      { id: "v2", status: "STOKTA", purchaseDate: d("2026-01-21"), saleDate: null, purchaseLocationId: "A" },
    ];
    const expenses = [
      { invoiceType: "RECEIVED", locationId: "A", documentDate: d("2026-01-15"), grandTotal: 4100 },
    ];
    const res = computeAllocatedExpenses(vehicles, expenses, [], d("2026-01-31"));
    // v1: 31 gün, v2: 11 gün → toplam 42; 4100/42*31 = 3026.19, 4100/42*11 = 1073.81
    expect(res.get("v1")!.locationShare).toBeCloseTo(3026.19, 2);
    expect(res.get("v2")!.locationShare).toBeCloseTo(1073.81, 2);
  });

  it("plakalı ve PROVIDED masrafları havuza almaz", () => {
    const vehicles = [{ id: "v1", status: "STOKTA", purchaseDate: d("2026-01-01"), saleDate: null, purchaseLocationId: "A" }];
    const expenses = [
      { invoiceType: "RECEIVED", vehicleId: "v1", locationId: "A", documentDate: d("2026-01-15"), grandTotal: 500 },
      { invoiceType: "PROVIDED", locationId: "A", documentDate: d("2026-01-15"), grandTotal: 900 },
    ];
    const res = computeAllocatedExpenses(vehicles, expenses, [], d("2026-01-31"));
    expect(res.get("v1")!.total).toBe(0);
  });

  it("genel masrafı o ay stoktaki tüm araçlara dağıtır", () => {
    const vehicles = [
      { id: "v1", status: "STOKTA", purchaseDate: d("2026-02-01"), saleDate: null },
      { id: "v2", status: "STOKTA", purchaseDate: d("2026-02-01"), saleDate: null },
    ];
    const expenses = [{ invoiceType: "RECEIVED", documentDate: d("2026-02-10"), grandTotal: 1000 }];
    const res = computeAllocatedExpenses(vehicles, expenses, [], d("2026-02-28"));
    expect(res.get("v1")!.generalShare).toBe(500);
    expect(res.get("v2")!.generalShare).toBe(500);
  });

  it("araçsız aydaki lokasyon masrafı artık havuzundan şube içindeki araçlara dağıtılır", () => {
    const vehicles = [{ id: "v1", status: "STOKTA", purchaseDate: d("2026-03-01"), saleDate: null, purchaseLocationId: "A" }];
    const expenses = [{ invoiceType: "RECEIVED", locationId: "A", documentDate: d("2026-01-15"), grandTotal: 300 }];
    const res = computeAllocatedExpenses(vehicles, expenses, [], d("2026-03-10"));
    expect(res.get("v1")!.locationShare).toBe(300);
  });
});
