import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AddressService {
  constructor(private readonly prisma: PrismaService) {}

  /** Tüm illeri döner (id, name). */
  getCities() {
    return this.prisma.city.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  }

  /** Bir ile ait ilçeleri döner. */
  getDistricts(cityId: number) {
    return this.prisma.district.findMany({
      where: { cityId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  }

  /** Bir ilçeye ait mahalleleri (ve posta kodlarını) döner.
   *  Autocomplete için q parametresiyle arama yapılabilir. */
  getNeighborhoods(districtId: number, q?: string) {
    const trimmed = q?.trim();
    return this.prisma.neighborhood.findMany({
      where: {
        districtId,
        ...(trimmed
          ? {
              OR: [
                { name: { contains: trimmed } },
                { postalCode: { startsWith: trimmed } },
              ],
            }
          : {}),
      },
      select: { id: true, name: true, postalCode: true },
      orderBy: { name: "asc" },
      take: 100,
    });
  }
}
