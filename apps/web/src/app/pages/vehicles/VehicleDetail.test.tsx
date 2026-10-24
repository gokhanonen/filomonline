import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { ThemeProvider } from "@/app/contexts/theme/Provider";
import VehicleDetailPage from "./VehicleDetail";
import * as vehicleService from "@/services/vehicleService";

vi.mock("@/services/vehicleService", () => ({
  getVehicle: vi.fn(),
  listListingUrls: vi.fn().mockResolvedValue([]),
  getActiveOption: vi.fn().mockResolvedValue(null),
  listOptions: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/services/catalogService", () => ({
  getCatalog: vi.fn().mockResolvedValue({
    brands: [],
    models: [],
    vehicleCategories: [],
    vehicleTypes: [],
    bodyTypes: [],
    colors: [],
    listingSources: [],
  }),
}));

vi.mock("@/services/documentService", () => ({
  getDocumentMeta: vi.fn().mockResolvedValue([]),
  listDocuments: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/services/storageService", () => ({
  presignDownload: vi.fn().mockResolvedValue("https://example.com/photo.jpg"),
}));

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe("VehicleDetailPage", () => {
  it("renders detail page successfully when vehicle is loaded", async () => {
    vi.mocked(vehicleService.getVehicle).mockResolvedValue({
      id: "veh-1",
      companyId: "comp-1",
      status: "STOKTA",
      isActive: true,
      plate: "34 TU 5566",
      brandName: "BMW",
      modelName: "520i",
      year: 2022,
      km: 45000,
      fuelType: "BENZIN",
      transmission: "OTOMATIK",
      warranty: true,
      spareKey: true,
      heavyDamage: false,
      listPrice: "1850000",
      purchasePrice: "1700000",
      purchaseRegime: "sahis",
      photos: [],
      tramerSet: [],
      listingUrls: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={["/vehicles/veh-1"]}>
          <Routes>
            <Route path="/vehicles/:id" element={<VehicleDetailPage />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    );

    expect(await screen.findByText("34 TU 5566")).toBeDefined();
    expect(screen.getByText("Stokta")).toBeDefined();
    expect(screen.getByText("BMW 520i 2022")).toBeDefined();
  });
});
