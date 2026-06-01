"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, Home, Users } from "lucide-react";
import {
  fetchDaftarPasien,
  fetchDashboardPasien,
  fetchDiagnosaTerbanyak,
  fetchKategoriUmur,
} from "@/lib/api/dashboard-pasien";
import type {
  DashboardPasienResponse,
  DiagnosaPeriode,
  DiagnosaTerbanyakItem,
  KategoriUmurItem,
  KategoriUmurPeriode,
  PasienBaris,
  PenjaminFilter,
} from "@/lib/types/dashboard-pasien";
import AgePieChart from "@/components/dashboard-pasien/AgePieChart";
import DiagnosaBarChart from "@/components/dashboard-pasien/DiagnosaBarChart";
import PatientsTable from "@/components/dashboard-pasien/PatientsTable";
import StatCard from "@/components/dashboard-pasien/StatCard";
import DashboardPasienSkeleton from "@/components/dashboard-pasien/DashboardPasienSkeleton";
import StatusPerawatanCard from "@/components/dashboard-pasien/StatusPerawatanCard";
import PasienDrilldownModal from "@/components/dashboard-pasien/PasienDrilldownModal";
import PasienDetailDrawer from "@/components/dashboard-pasien/PasienDetailDrawer";
import FadeIn from "@/components/ui/FadeIn";
import type { DrilldownModalConfig } from "@/lib/drilldown";
import { periodeLabel } from "@/lib/drilldown";

const DAFTAR_PAGE_SIZE = 20;

export default function DashboardPasien() {
  const [dashboard, setDashboard] = useState<DashboardPasienResponse | null>(
    null,
  );
  const [diagnosa, setDiagnosa] = useState<DiagnosaTerbanyakItem[]>([]);
  const [patients, setPatients] = useState<PasienBaris[]>([]);
  const [patientsTotal, setPatientsTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [diagnosaLoading, setDiagnosaLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [diagnosaPeriode, setDiagnosaPeriode] =
    useState<DiagnosaPeriode>("semua");
  const [diagnosaSearch, setDiagnosaSearch] = useState("");
  const [debouncedDiagnosaSearch, setDebouncedDiagnosaSearch] = useState("");
  const [kategoriUmur, setKategoriUmur] = useState<KategoriUmurItem[]>([]);
  const [kategoriUmurPeriode, setKategoriUmurPeriode] =
    useState<KategoriUmurPeriode>("semua");
  const [kategoriUmurLoading, setKategoriUmurLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [filterGender, setFilterGender] = useState("");
  const [filterPenjamin, setFilterPenjamin] = useState<PenjaminFilter>("");
  const [drilldown, setDrilldown] = useState<DrilldownModalConfig | null>(null);
  const [detailPasienId, setDetailPasienId] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, daftar] = await Promise.all([
        fetchDashboardPasien({ limit: 20 }),
        fetchDaftarPasien({ limit: 20 }),
      ]);
      setDashboard(data);
      setPatients(daftar.data ?? []);
      setPatientsTotal(daftar.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDiagnosa = useCallback(
    async (periode: DiagnosaPeriode, cari: string) => {
      setDiagnosaLoading(true);
      try {
        const res = await fetchDiagnosaTerbanyak(periode, 10, cari);
        setDiagnosa(res.data ?? []);
      } catch {
        setDiagnosa([]);
      } finally {
        setDiagnosaLoading(false);
      }
    },
    [],
  );

  const loadKategoriUmur = useCallback(async (periode: KategoriUmurPeriode) => {
    setKategoriUmurLoading(true);
    try {
      const data = await fetchKategoriUmur(periode);
      setKategoriUmur(data ?? []);
    } catch {
      setKategoriUmur([]);
    } finally {
      setKategoriUmurLoading(false);
    }
  }, []);

  const loadPatients = useCallback(
    async (
      cari: string,
      jk: string,
      penjamin: PenjaminFilter,
      offset = 0,
      append = false,
    ) => {
      if (append) setLoadingMore(true);
      else setTableLoading(true);
      try {
        const res = await fetchDaftarPasien({
          cari: cari.trim() || undefined,
          jenis_kelamin: jk || undefined,
          penjamin: penjamin || undefined,
          limit: DAFTAR_PAGE_SIZE,
          offset,
        });
        setPatientsTotal(res.total);
        setPatients((prev) =>
          append ? [...prev, ...(res.data ?? [])] : (res.data ?? []),
        );
      } catch {
        if (!append) {
          setPatients([]);
          setPatientsTotal(0);
        }
      } finally {
        setTableLoading(false);
        setLoadingMore(false);
      }
    },
    [],
  );

  const loadMorePatients = useCallback(() => {
    loadPatients(search, filterGender, filterPenjamin, patients.length, true);
  }, [loadPatients, search, filterGender, filterPenjamin, patients.length]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedDiagnosaSearch(diagnosaSearch), 350);
    return () => clearTimeout(t);
  }, [diagnosaSearch]);

  useEffect(() => {
    if (loading) return;
    loadDiagnosa(diagnosaPeriode, debouncedDiagnosaSearch);
  }, [diagnosaPeriode, debouncedDiagnosaSearch, loadDiagnosa, loading]);

  useEffect(() => {
    loadKategoriUmur(kategoriUmurPeriode);
  }, [kategoriUmurPeriode, loadKategoriUmur]);

  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => {
      loadPatients(search, filterGender, filterPenjamin);
    }, 400);
    return () => clearTimeout(t);
  }, [search, filterGender, filterPenjamin, loadPatients, loading]);

  if (loading) {
    return <DashboardPasienSkeleton />;
  }

  if (error || !dashboard) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto gap-3 p-12">
        <p className="text-sm text-red-600">{error ?? "Data tidak tersedia"}</p>
        <p className="max-w-md text-center text-xs text-zinc-500">
          Pastikan backend Go berjalan di{" "}
          <code className="rounded bg-zinc-100 px-1">localhost:8080</code> dan
          database terhubung.
        </p>
        <button
          type="button"
          onClick={loadDashboard}
          className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
        >
          Coba lagi
        </button>
      </div>
    );
  }

  const { ringkasan, status_perawatan } = dashboard;

  const openKategoriDrilldown = (kategori: string, jumlah: number) => {
    setDrilldown({
      title: kategori,
      subtitle: `Periode: ${periodeLabel(kategoriUmurPeriode)} · ${jumlah} pasien`,
      tipe: "kategori_umur",
      periode: kategoriUmurPeriode,
      kategori,
    });
  };

  return (
    <>
    <PasienDrilldownModal
      config={drilldown}
      onClose={() => setDrilldown(null)}
    />
    <PasienDetailDrawer
      noRkmMedis={detailPasienId}
      onClose={() => setDetailPasienId(null)}
    />
    <div className="min-h-0 flex-1 overflow-y-auto bg-zinc-50 p-8">
      <FadeIn className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">Dashboard Pasien</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Kelola, telusuri, dan analisis data pasien klinik
        </p>
      </FadeIn>

      <div className="grid gap-4 md:grid-cols-3">
        <FadeIn delayMs={80}>
          <StatCard
            label="Pasien Rawat Inap"
            value={ringkasan.pasien_rawat_inap}
            icon={Home}
            iconBg="bg-rose-50"
            iconColor="text-rose-500"
            onDetailClick={() =>
              setDrilldown({
                title: "Pasien Rawat Inap",
                subtitle: "Semua registrasi rawat inap (semua waktu)",
                tipe: "ringkasan_ranap",
              })
            }
          />
        </FadeIn>
        <FadeIn delayMs={160}>
          <StatCard
            label="Pasien Rawat Jalan"
            value={ringkasan.pasien_rawat_jalan}
            icon={Activity}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-500"
            onDetailClick={() =>
              setDrilldown({
                title: "Pasien Rawat Jalan",
                subtitle: "Semua registrasi rawat jalan (semua waktu)",
                tipe: "ringkasan_ralan",
              })
            }
          />
        </FadeIn>
        <FadeIn delayMs={240}>
          <StatCard
            label="Total Pasien Terdaftar"
            value={ringkasan.total_pasien_terdaftar}
            icon={Users}
            iconBg="bg-violet-50"
            iconColor="text-violet-500"
            onDetailClick={() =>
              setDrilldown({
                title: "Total Pasien Terdaftar",
                subtitle: "Semua pasien terdaftar di klinik",
                tipe: "ringkasan_total",
              })
            }
          />
        </FadeIn>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <FadeIn delayMs={200}>
          <AgePieChart
            data={kategoriUmur}
            periode={kategoriUmurPeriode}
            onPeriodeChange={setKategoriUmurPeriode}
            onKategoriClick={openKategoriDrilldown}
            loading={kategoriUmurLoading}
          />
        </FadeIn>

        <FadeIn delayMs={280}>
          <StatusPerawatanCard
            data={status_perawatan}
            onInapClick={() =>
              setDrilldown({
                title: "Pasien Rawat Inap Aktif",
                subtitle: "Pasien inap yang masih dirawat hari ini",
                tipe: "status_inap_aktif",
              })
            }
            onJalanClick={() =>
              setDrilldown({
                title: "Pasien Rawat Jalan Aktif",
                subtitle: "Registrasi rawat jalan aktif hari ini",
                tipe: "status_jalan_aktif",
              })
            }
          />
        </FadeIn>
      </div>

      <FadeIn delayMs={320} className="mt-6">
        <DiagnosaBarChart
          data={diagnosa}
          periode={diagnosaPeriode}
          onPeriodeChange={setDiagnosaPeriode}
          search={diagnosaSearch}
          onSearchChange={setDiagnosaSearch}
          onDiagnosaClick={(item) =>
            setDrilldown({
              title: item.nama_penyakit,
              subtitle: `Periode: ${periodeLabel(diagnosaPeriode)} · ${item.jumlah} kasus (${item.persentase.toFixed(2)}%)`,
              tipe: "diagnosa",
              periode: diagnosaPeriode,
              kd_penyakit: item.kd_penyakit,
            })
          }
          loading={diagnosaLoading}
        />
      </FadeIn>

      <FadeIn delayMs={380} className="mt-6">
        <PatientsTable
          rows={patients}
          total={patientsTotal}
          loading={tableLoading}
          loadingMore={loadingMore}
          hasMore={patients.length < patientsTotal}
          onLoadMore={loadMorePatients}
          search={search}
          onSearchChange={setSearch}
          filterGender={filterGender}
          onFilterGenderChange={setFilterGender}
          filterPenjamin={filterPenjamin}
          onFilterPenjaminChange={setFilterPenjamin}
          onRowClick={(row) => setDetailPasienId(row.id)}
        />
      </FadeIn>
    </div>
    </>
  );
}
