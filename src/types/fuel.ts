export interface FuelTypeOption {
  id: string;
  name: string;
  pricePerLiter: number;
  color: string;
}

export interface FuelSettings {
  /** Jatah potongan modal setiap kali isi BBM (default: 40000) */
  subsidyPerFill: number;
  /** Daftar pilihan BBM beserta harganya */
  fuelTypes: FuelTypeOption[];
  /** Metode hitung km/L: 'prev_liter' (jarak / liter isi sebelumnya) atau 'current_liter' (jarak / liter isi saat ini) */
  kmPerLiterMethod: "prev_liter" | "current_liter";
}

export interface CapitalRefill {
  id: string;
  tanggal: string;
  nominal: number;
  keterangan: string;
  createdAt: number;
}

export interface FuelTransaction {
  id: string;
  tanggal: string;
  jenisBbm: string;
  hargaPerLiter: number;
  totalBayar: number;
  jumlahLiter: number;
  pakaiModal: boolean;
  potongModal: number;
  uangHarian: number;
  odometerKm: number;
  keterangan: string;
  createdAt: number;
}

export interface EnrichedFuelTransaction extends FuelTransaction {
  /** KM dari pengisian sebelumnya (jika ada) */
  prevOdometerKm: number | null;
  /** Selisih jarak tempuh (km) dibanding pengisian sebelumnya */
  jarakTempuhKm: number | null;
  /** Rata-rata km/L menggunakan liter pengisian sebelumnya */
  kmPerLiterFromPrev: number | null;
  /** Rata-rata km/L menggunakan liter pengisian saat ini */
  kmPerLiterFromCurrent: number | null;
  /** Biaya per kilometer (Rp/km) */
  biayaPerKm: number | null;
}

export const DEFAULT_FUEL_TYPES: FuelTypeOption[] = [
  {
    id: "pertalite",
    name: "Pertalite",
    pricePerLiter: 10000,
    color: "emerald",
  },
  {
    id: "pertamax",
    name: "Pertamax",
    pricePerLiter: 16300,
    color: "blue",
  },
  {
    id: "pertamax-turbo",
    name: "Pertamax Turbo",
    pricePerLiter: 20000,
    color: "rose",
  },
];

export const DEFAULT_SETTINGS: FuelSettings = {
  subsidyPerFill: 40000,
  fuelTypes: DEFAULT_FUEL_TYPES,
  kmPerLiterMethod: "prev_liter",
};

