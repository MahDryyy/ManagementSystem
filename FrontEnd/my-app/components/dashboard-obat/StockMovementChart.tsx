"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DashboardStockMovement } from "@/lib/types/dashboard-obat";

type StockMovementChartProps = {
  data: DashboardStockMovement[];
};

export default function StockMovementChart({ data }: StockMovementChartProps) {
  const chartData = data.map((item) => ({
    month: new Intl.DateTimeFormat("id-ID", {
      month: "short",
      year: "numeric",
    }).format(new Date(`${item.month}-01T00:00:00`)),
    masuk: Number(item.barang_masuk),
    keluar: Number(item.barang_keluar),
  }));

  return (
    <div className="rounded-2xl border border-[#e8eaed] bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-zinc-800">Pergerakan Stok</h3>
        <p className="mt-0.5 text-sm text-zinc-500">
          Barang masuk vs keluar (5 bulan terakhir)
        </p>
      </div>

      <div className="h-[280px]">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barGap={4} barCategoryGap="20%">
              <CartesianGrid
                stroke="#e4e4e7"
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                stroke="#a1a1aa"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#a1a1aa"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => Number(v).toLocaleString("id-ID")}
              />
              <Tooltip
                cursor={{ fill: "rgba(0, 184, 217, 0.06)" }}
                formatter={(value, name) => [
                  Number(value).toLocaleString("id-ID"),
                  name,
                ]}
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e8eaed",
                  borderRadius: "12px",
                  padding: "10px 14px",
                  fontSize: "13px",
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={32}
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: "13px", paddingTop: "8px" }}
              />
              <Bar
                dataKey="masuk"
                fill="#00B8D9"
                name="Barang Masuk"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
                isAnimationActive={false}
              />
              <Bar
                dataKey="keluar"
                fill="#10B981"
                name="Barang Keluar"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-zinc-200 text-sm text-zinc-400">
            Belum ada data pergerakan stok
          </div>
        )}
      </div>
    </div>
  );
}
