"use client";

import { useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { fetchPasienDetail } from "@/lib/api/dashboard-pasien";
import type { PasienDetail } from "@/lib/types/dashboard-pasien";
import { Skeleton } from "@/components/ui/Skeleton";

type PasienDetailDrawerProps = {
  noRkmMedis: string | null;
  onClose: () => void;
};

function formatDate(iso: string) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function Field({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string | number;
  className?: string;
}) {
  const text = value === "" || value === undefined ? "-" : String(value);
  return (
    <div className={className}>
      <dt className="text-[11px] font-medium tracking-wide text-zinc-400 uppercase">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-zinc-800 break-words">{text}</dd>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-zinc-100 last:border-0">
      <h3 className="px-4 py-3 text-xs font-semibold tracking-wide text-zinc-500 uppercase sm:px-6">
        {title}
      </h3>
      <dl className="grid grid-cols-1 gap-3 px-4 pb-4 sm:grid-cols-2 sm:px-6 sm:pb-5">
        {children}
      </dl>
    </section>
  );
}

export default function PasienDetailDrawer({
  noRkmMedis,
  onClose,
}: PasienDetailDrawerProps) {
  const [data, setData] = useState<PasienDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!noRkmMedis) {
      setData(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchPasienDetail(noRkmMedis)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Gagal memuat detail");
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [noRkmMedis]);

  useEffect(() => {
    if (!noRkmMedis) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [noRkmMedis, onClose]);

  useEffect(() => {
    if (!noRkmMedis) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [noRkmMedis]);

  if (!noRkmMedis) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Tutup"
        onClick={onClose}
      />
      <aside
        className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-xl sm:max-w-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pasien-detail-title"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-100 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <h2
              id="pasien-detail-title"
              className="truncate text-lg font-semibold text-zinc-900"
            >
              {loading ? "Memuat…" : (data?.identitas.nama ?? "Detail Pasien")}
            </h2>
            <p className="mt-0.5 text-sm text-cyan-700">{noRkmMedis}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full p-2 text-zinc-500 hover:bg-zinc-100"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {loading ? (
            <div className="space-y-4 p-4 sm:p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          ) : error ? (
            <p className="p-6 text-center text-sm text-red-600">{error}</p>
          ) : data ? (
            <>
              {data.perawatan.ruangan_aktif ? (
                <div className="mx-4 mt-4 rounded-xl border border-cyan-100 bg-cyan-50/60 px-4 py-3 sm:mx-6">
                  <p className="text-[11px] font-semibold tracking-wide text-cyan-800 uppercase">
                    Sedang dirawat inap
                  </p>
                  <p className="mt-1 text-sm font-medium text-zinc-900">
                    {data.perawatan.ruangan_aktif}
                  </p>
                  {data.perawatan.no_rawat_aktif ? (
                    <p className="mt-0.5 text-xs text-zinc-500">
                      No. rawat: {data.perawatan.no_rawat_aktif}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <Section title="Identitas">
                <Field label="Nama" value={data.identitas.nama} className="sm:col-span-2" />
                <Field label="No. KTP" value={data.identitas.no_ktp} />
                <Field label="Jenis kelamin" value={data.identitas.jenis_kelamin} />
                <Field
                  label="Tempat, tanggal lahir"
                  value={`${data.identitas.tmp_lahir || "-"}, ${formatDate(data.identitas.tgl_lahir)}`}
                  className="sm:col-span-2"
                />
                <Field
                  label="Umur"
                  value={
                    data.identitas.umur_label ||
                    `${data.identitas.umur_tahun} tahun`
                  }
                />
                <Field label="Gol. darah" value={data.identitas.gol_darah} />
                <Field label="Agama" value={data.identitas.agama} />
                <Field label="Status nikah" value={data.identitas.stts_nikah} />
                <Field label="Pekerjaan" value={data.identitas.pekerjaan} />
              </Section>

              <Section title="Kontak">
                <Field label="Alamat" value={data.kontak.alamat} className="sm:col-span-2" />
                <Field label="Telepon" value={data.kontak.no_telepon} />
                <Field label="Email" value={data.kontak.email} />
              </Section>

              <Section title="Penjamin">
                <Field label="Cara bayar" value={data.penjamin.penjamin} />
                <Field label="Kode penjab" value={data.penjamin.kd_pj} />
                <Field label="No. peserta" value={data.penjamin.no_peserta} />
                <Field label="Perusahaan" value={data.penjamin.perusahaan} />
              </Section>

              <Section title="Keluarga / penanggung jawab">
                <Field label="Hubungan" value={data.keluarga.hubungan} />
                <Field label="Nama" value={data.keluarga.nama} />
                <Field label="Pekerjaan" value={data.keluarga.pekerjaan} />
                <Field label="Alamat" value={data.keluarga.alamat} className="sm:col-span-2" />
                <Field label="Kelurahan" value={data.keluarga.kelurahan} />
                <Field label="Kecamatan" value={data.keluarga.kecamatan} />
                <Field label="Kabupaten" value={data.keluarga.kabupaten} />
                <Field label="Propinsi" value={data.keluarga.propinsi} />
              </Section>

              <Section title="Lainnya">
                <Field label="Pendidikan" value={data.lainnya.pendidikan} />
                <Field label="Nama ibu" value={data.lainnya.nm_ibu} />
                <Field
                  label="Tanggal daftar"
                  value={formatDate(data.lainnya.tgl_daftar)}
                />
                <Field label="Status rawat terakhir" value={data.perawatan.status_rawat} />
              </Section>
            </>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
