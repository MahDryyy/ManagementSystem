"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchGrafikPemasukan,
  fetchGrafikPendapatanLaborat,
  fetchGrafikPengeluaran,
  fetchHistoriKeuangan,
  fetchHistoriPengeluaran,
  fetchKeuanganTotal,
  fetchPemasukanKategori,
  fetchPendapatanAkun,
  fetchRingkasanKeuangan,
  fetchRingkasanPendapatanLaborat,
} from "@/lib/api/dashboard-keuangan";
import type {
  GrafikGranularity,
  GrafikTitik,
  HistoriItem,
  HistoriPengeluaranRow,
  KeuanganPeriode,
  KeuanganTotalTitik,
  PemasukanKategoriItem,
  PendapatanAkunRow,
  RingkasanPemasukan,
  RingkasanPendapatanLaborat,
  TotalPerAkun,
} from "@/lib/types/dashboard-keuangan";
import HistoriList from "@/components/dashboard-keuangan/HistoriList";
import HistoriPengeluaranTable from "@/components/dashboard-keuangan/HistoriPengeluaranTable";
import KeuanganTotalChart from "@/components/dashboard-keuangan/KeuanganTotalChart";
import LineChartCard from "@/components/dashboard-keuangan/LineChartCard";
import PemasukanDonut from "@/components/dashboard-keuangan/PemasukanDonut";
import PendapatanLaboratPanel from "@/components/dashboard-keuangan/PendapatanLaboratPanel";
import PendapatanTable from "@/components/dashboard-keuangan/PendapatanTable";
import StrukDrawer from "@/components/dashboard-keuangan/StrukDrawer";
import FadeIn from "@/components/ui/FadeIn";

const TABLE_PAGE = 20;

export default function DashboardKeuangan() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [ringkasan, setRingkasan] = useState<RingkasanPemasukan>({
    harian: 0,
    mingguan: 0,
    bulanan: 0,
  });
  const [grafikPemasukan, setGrafikPemasukan] = useState<GrafikTitik[]>([]);
  const [grafikPengeluaran, setGrafikPengeluaran] = useState<GrafikTitik[]>([]);
  const [grafikGranularity, setGrafikGranularity] =
    useState<GrafikGranularity>("day");
  const [grafikLoading, setGrafikLoading] = useState(false);

  const [keuanganTotal, setKeuanganTotal] = useState<KeuanganTotalTitik[]>([]);
  const [totalPeriode, setTotalPeriode] =
    useState<KeuanganPeriode>("bulan_ini");
  const [totalLoading, setTotalLoading] = useState(false);

  const [ringkasanLaborat, setRingkasanLaborat] =
    useState<RingkasanPendapatanLaborat>({
      harian: 0,
      mingguan: 0,
      bulanan: 0,
      tahunan: 0,
      semua: 0,
    });
  const [rincianLaborat, setRincianLaborat] = useState<GrafikTitik[]>([]);
  const [laboratPeriode, setLaboratPeriode] =
    useState<KeuanganPeriode>("bulan_ini");
  const [laboratLoading, setLaboratLoading] = useState(false);
  const [rincianLaboratLoading, setRincianLaboratLoading] = useState(false);

  const [kategori, setKategori] = useState<PemasukanKategoriItem[]>([]);
  const [histori, setHistori] = useState<HistoriItem[]>([]);
  const [historiPengeluaran, setHistoriPengeluaran] = useState<HistoriItem[]>([]);
  const [pengeluaranRows, setPengeluaranRows] = useState<HistoriPengeluaranRow[]>([]);
  const [pengeluaranTotal, setPengeluaranTotal] = useState(0);
  const [pengeluaranLoading, setPengeluaranLoading] = useState(false);
  const [pengeluaranLoadingMore, setPengeluaranLoadingMore] = useState(false);
  const [showFullPengeluaran, setShowFullPengeluaran] = useState(false);
  const pengeluaranRef = useRef<HTMLDivElement>(null);

  const [rows, setRows] = useState<PendapatanAkunRow[]>([]);
  const [rowsTotal, setRowsTotal] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);
  const [perAkun, setPerAkun] = useState<TotalPerAkun[]>([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [periode, setPeriode] = useState<KeuanganPeriode>("bulan_ini");
  const [filterJenis, setFilterJenis] = useState<"" | "ralan" | "ranap">("");
  const [tableError, setTableError] = useState<string | null>(null);
  const [showFullTable, setShowFullTable] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);
  const [strukNoRawat, setStrukNoRawat] = useState<string | null>(null);

  useEffect(() => {
    if (showFullTable && tableRef.current) {
      tableRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [showFullTable]);

  useEffect(() => {
    if (showFullPengeluaran && pengeluaranRef.current) {
      pengeluaranRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [showFullPengeluaran]);

  function mapHistoriPengeluaran(rows: HistoriPengeluaranRow[]): HistoriItem[] {
    return rows.map((r) => ({
      id: r.no_keluar,
      judul: r.keterangan?.trim() || r.kategori || "Pengeluaran",
      tanggal: r.tanggal,
      jenis: "pengeluaran" as const,
      nominal: r.biaya,
      kategori: r.kategori,
    }));
  }

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ring, kat, hist, histPeng] = await Promise.all([
        fetchRingkasanKeuangan(),
        fetchPemasukanKategori("bulan_ini"),
        fetchHistoriKeuangan(8, 0),
        fetchHistoriPengeluaran(8, 0),
      ]);
      setRingkasan(ring);
      setKategori(kat);
      setHistori(hist.data ?? []);
      setHistoriPengeluaran(mapHistoriPengeluaran(histPeng.data ?? []));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Gagal memuat dashboard keuangan harap restart aplikasi",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadGrafik = useCallback(async (g: GrafikGranularity) => {
    setGrafikLoading(true);
    try {
      const [pem, peng] = await Promise.all([
        fetchGrafikPemasukan(g),
        fetchGrafikPengeluaran(g),
      ]);
      setGrafikPemasukan(pem);
      setGrafikPengeluaran(peng);
    } catch {
      setGrafikPemasukan([]);
      setGrafikPengeluaran([]);
    } finally {
      setGrafikLoading(false);
    }
  }, []);

  const loadKeuanganTotal = useCallback(async (p: KeuanganPeriode) => {
    setTotalLoading(true);
    try {
      const data = await fetchKeuanganTotal(p);
      setKeuanganTotal(data);
    } catch {
      setKeuanganTotal([]);
    } finally {
      setTotalLoading(false);
    }
  }, []);

  const loadRingkasanLaborat = useCallback(async () => {
    setLaboratLoading(true);
    try {
      const data = await fetchRingkasanPendapatanLaborat();
      setRingkasanLaborat(data);
    } catch {
      setRingkasanLaborat({
        harian: 0,
        mingguan: 0,
        bulanan: 0,
        tahunan: 0,
        semua: 0,
      });
    } finally {
      setLaboratLoading(false);
    }
  }, []);

  const loadRincianLaborat = useCallback(async (p: KeuanganPeriode) => {
    setRincianLaboratLoading(true);
    try {
      const data = await fetchGrafikPendapatanLaborat(p);
      setRincianLaborat(data);
    } catch {
      setRincianLaborat([]);
    } finally {
      setRincianLaboratLoading(false);
    }
  }, []);

  const loadTable = useCallback(
    async (
      cari: string,
      p: KeuanganPeriode,
      jenis: "" | "ralan" | "ranap",
      offset = 0,
      append = false,
    ) => {
      if (append) setLoadingMore(true);
      else {
        setTableLoading(true);
        setTableError(null);
      }
      try {
        const res = await fetchPendapatanAkun({
          periode: p,
          cari: cari.trim() || undefined,
          jenis_rawat: jenis || undefined,
          limit: TABLE_PAGE,
          offset,
        });
        setRowsTotal(res.total);
        setGrandTotal(res.grand_total);
        setPerAkun(res.per_akun ?? []);
        setRows((prev) =>
          append ? [...prev, ...(res.data ?? [])] : (res.data ?? []),
        );
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : "Gagal memuat data pendapatan";
        setTableError(msg);
        if (!append) {
          setRows([]);
          setRowsTotal(0);
          setGrandTotal(0);
          setPerAkun([]);
        }
      } finally {
        setTableLoading(false);
        setLoadingMore(false);
      }
    },
    [],
  );

  const loadHistoriPengeluaranTable = useCallback(
    async (offset = 0, append = false) => {
      if (append) setPengeluaranLoadingMore(true);
      else setPengeluaranLoading(true);
      try {
        const res = await fetchHistoriPengeluaran(TABLE_PAGE, offset);
        setPengeluaranTotal(res.total);
        setPengeluaranRows((prev) =>
          append ? [...prev, ...(res.data ?? [])] : (res.data ?? []),
        );
      } catch {
        if (!append) {
          setPengeluaranRows([]);
          setPengeluaranTotal(0);
        }
      } finally {
        setPengeluaranLoading(false);
        setPengeluaranLoadingMore(false);
      }
    },
    [],
  );

  useEffect(() => {
    loadOverview();
    loadGrafik("day");
    loadKeuanganTotal("bulan_ini");
    loadRingkasanLaborat();
    loadRincianLaborat("bulan_ini");
    loadTable("", "bulan_ini", "", 0, false);
    loadHistoriPengeluaranTable(0, false);
  }, [
    loadOverview,
    loadGrafik,
    loadKeuanganTotal,
    loadRingkasanLaborat,
    loadRincianLaborat,
    loadTable,
    loadHistoriPengeluaranTable,
  ]);

  useEffect(() => {
    loadGrafik(grafikGranularity);
  }, [grafikGranularity, loadGrafik]);

  useEffect(() => {
    loadKeuanganTotal(totalPeriode);
  }, [totalPeriode, loadKeuanganTotal]);

  useEffect(() => {
    loadRincianLaborat(laboratPeriode);
  }, [laboratPeriode, loadRincianLaborat]);

  useEffect(() => {
    loadTable(debouncedSearch, periode, filterJenis, 0, false);
  }, [debouncedSearch, periode, filterJenis, loadTable]);

  const hasMore = rows.length < rowsTotal;
  const hasMorePengeluaran = pengeluaranRows.length < pengeluaranTotal;

  if (error && !loading && rows.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-8">
        <p className="text-sm text-red-600">{error}</p>
        <button
          type="button"
          onClick={() => {
            loadOverview();
            loadTable(debouncedSearch, periode, filterJenis);
          }}
          className="rounded-lg bg-cyan-600 px-4 py-2 text-sm text-white"
        >
          Coba lagi
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-zinc-50 p-4 sm:p-6 lg:p-8">
      <FadeIn className="mb-6">
        <h2 className="text-xl font-bold text-zinc-900 sm:text-2xl">
          Dashboard Keuangan
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Arahkan kursor ke grafik untuk melihat nominal per titik.
        </p>
      </FadeIn>

      <div className="grid gap-4 lg:grid-cols-2">
        <FadeIn delayMs={80}>
          <LineChartCard
            title="Grafik Pengeluaran"
            data={grafikPengeluaran}
            color="#f97316"
            seriesName="Pengeluaran"
            granularity={grafikGranularity}
            onGranularityChange={setGrafikGranularity}
            loading={grafikLoading || loading}
          />
        </FadeIn>
        <FadeIn delayMs={160}>
          <LineChartCard
            title="Grafik Pemasukan"
            data={grafikPemasukan}
            color="#22c55e"
            seriesName="Pemasukan"
            granularity={grafikGranularity}
            onGranularityChange={setGrafikGranularity}
            loading={grafikLoading || loading}
          />
        </FadeIn>
      </div>

      <FadeIn delayMs={240} className="mt-4">
        <KeuanganTotalChart
          data={keuanganTotal}
          periode={totalPeriode}
          onPeriodeChange={setTotalPeriode}
          loading={totalLoading && keuanganTotal.length === 0}
        />
      </FadeIn>

      <FadeIn delayMs={280} className="mt-4">
        <PendapatanLaboratPanel
          ringkasan={ringkasanLaborat}
          rincian={rincianLaborat}
          periode={laboratPeriode}
          onPeriodeChange={setLaboratPeriode}
          loading={laboratLoading}
          rincianLoading={rincianLaboratLoading}
        />
      </FadeIn>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <FadeIn delayMs={320}>
          <PemasukanDonut
            ringkasan={ringkasan}
            kategori={kategori}
            loading={loading}
          />
        </FadeIn>
        <FadeIn delayMs={360}>
          <HistoriList
            title="Histori Pemasukan"
            items={histori}
            loading={loading}
            emptyLabel="Belum ada pemasukan."
            onViewAll={() => setShowFullTable(true)}
          />
        </FadeIn>
      </div>

      <FadeIn delayMs={400} className="mt-4">
        <HistoriList
          title="Histori Pengeluaran"
          items={historiPengeluaran}
          loading={loading}
          emptyLabel="Belum ada pengeluaran."
          onViewAll={() => setShowFullPengeluaran(true)}
        />
      </FadeIn>

      <FadeIn delayMs={440} className="mt-4">
        <div ref={pengeluaranRef}>
          <HistoriPengeluaranTable
            rows={pengeluaranRows}
            total={pengeluaranTotal}
            loading={pengeluaranLoading && pengeluaranRows.length === 0}
            loadingMore={pengeluaranLoadingMore}
            hasMore={hasMorePengeluaran}
            onLoadMore={() =>
              loadHistoriPengeluaranTable(pengeluaranRows.length, true)
            }
          />
        </div>
      </FadeIn>

      <FadeIn delayMs={480} className="mt-6">
        <div ref={tableRef}>
          {tableError && (
            <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {tableError}
            </p>
          )}
          <PendapatanTable
            rows={rows}
            total={rowsTotal}
            grandTotal={grandTotal}
            perAkun={perAkun}
            loading={tableLoading && rows.length === 0}
            loadingMore={loadingMore}
            hasMore={hasMore}
            onLoadMore={() =>
              loadTable(
                debouncedSearch,
                periode,
                filterJenis,
                rows.length,
                true,
              )
            }
            search={search}
            onSearchChange={setSearch}
            periode={periode}
            onPeriodeChange={setPeriode}
            filterJenis={filterJenis}
            onFilterJenisChange={setFilterJenis}
            onRowClick={(row) => setStrukNoRawat(row.no_rawat)}
          />
        </div>
      </FadeIn>

      <StrukDrawer noRawat={strukNoRawat} onClose={() => setStrukNoRawat(null)} />
    </div>
  );
}
