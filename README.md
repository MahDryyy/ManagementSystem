# Management System

Management System adalah aplikasi dashboard klinik berbasis:

- `BackEnd`: Go + Gin + MySQL
- `FrontEnd/my-app`: Next.js + React + Tailwind CSS

Sistem ini dipakai untuk mengelola dan memantau beberapa area utama seperti autentikasi admin, dashboard pasien, dashboard keuangan, dashboard obat, laporan, serta integrasi data website dan sosial media.

## Fitur Utama

- Login admin berbasis JWT
- Manajemen user dan role untuk superadmin
- Dashboard pasien
- Dashboard keuangan
- Dashboard obat
- Export laporan CSV dan Excel
- Integrasi dashboard website, review, visitor, sosial media, dan TikTok

## Arsitektur Singkat

```text
Frontend (Next.js)
  -> request ke API BackEnd
BackEnd (Go + Gin)
  -> query ke MySQL
  -> proxy ke layanan website eksternal untuk data web/sosial media
```

Catatan:

- Frontend membaca base URL API dari `NEXT_PUBLIC_API_URL`
- Backend berjalan default di port `8080`
- Frontend development berjalan default di port `3000`

## Struktur Folder

```text
ManagementSystem/
├── BackEnd/
│   ├── Controllers/
│   ├── Database/
│   ├── Middleware/
│   ├── Models/
│   ├── Repositories/
│   ├── Routes/
│   ├── Services/
│   ├── Utils/
│   ├── main.go
│   └── go.mod
├── FrontEnd/
│   └── my-app/
│       ├── app/
│       ├── components/
│       ├── lib/
│       └── package.json
├── test/
├── docker-compose.yml
└── .env
```

## Kebutuhan Sistem

Sebelum menjalankan project, siapkan:

- Go `1.25.x`
- Node.js `20+`
- npm `10+`
- MySQL / MariaDB
- Git

Opsional:

- Docker + Docker Compose

## Instalasi

### 1. Clone repository

```bash
git clone <url-repository>
cd ManagementSystem
```

### 2. Install dependency backend

```bash
cd BackEnd
go mod download
```

### 3. Install dependency frontend

```bash
cd FrontEnd/my-app
npm install
```

## Konfigurasi Environment

Project ini memakai beberapa file environment yang berbeda tergantung mode menjalankan sistem.

### A. Backend local: `BackEnd/.env`

Buat file `BackEnd/.env` lalu isi minimal seperti ini:

```env
DB_USER=your_db_user
DB_PASS=your_db_password
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=your_db_name

PORT=8080
JWT_SECRET=replace_with_secure_secret
X_ADMIN_KEY=replace_with_external_web_admin_key
```

Penjelasan:

- `DB_USER`: username database MySQL
- `DB_PASS`: password database
- `DB_HOST`: host database
- `DB_PORT`: port database
- `DB_NAME`: nama database
- `PORT`: port backend Gin, default `8080`
- `JWT_SECRET`: secret untuk generate dan validasi token login
- `X_ADMIN_KEY`: API key untuk mengambil data website/sosial media dari layanan eksternal

### B. Frontend local: `FrontEnd/my-app/.env.local`

Buat file `FrontEnd/my-app/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

Penjelasan:

- `NEXT_PUBLIC_API_URL`: base URL backend yang dipanggil frontend

### C. Root `.env` untuk Docker Compose

Jika ingin menjalankan lewat `docker-compose.yml`, siapkan file `.env` di root project:

```env
MYSQL_USER=your_mysql_user
MYSQL_PASSWORD=your_mysql_password
MYSQL_DATABASE=your_database_name
JWT_SECRET=replace_with_secure_secret
ALLOWED_ORIGINS=http://localhost:3001
DOCKER_USERNAME=local
```

Catatan:

- `ALLOWED_ORIGINS` sudah diteruskan ke container backend, tetapi middleware CORS saat ini masih mengizinkan `*`
- Jika memakai Docker Compose, pastikan network eksternal `klinik-network` sudah ada

## Menjalankan Sistem Secara Lokal

### 1. Jalankan backend

Dari folder `BackEnd`:

```bash
go run main.go
```

Jika sukses, backend akan berjalan di:

```text
http://localhost:8080
```

Endpoint health check:

```text
GET /api/health
```

### 2. Jalankan frontend

Dari folder `FrontEnd/my-app`:

```bash
npm run dev
```

Lalu buka:

```text
http://localhost:3000
```

## Menjalankan dengan Docker

Command:

```bash
docker compose up --build
```

Secara default pada file `docker-compose.yml` saat ini:

- Backend diexpose ke `8080`
- Frontend diexpose ke `3001`

### Catatan penting Docker Compose

Pada konfigurasi sekarang, image frontend dibuild dengan:

```text
NEXT_PUBLIC_API_URL=https://api-manajemen.kriampelgading.my.id
```

Artinya:

- frontend container tidak otomatis mengarah ke backend container lokal
- jika ingin full local via Docker, ubah build arg `NEXT_PUBLIC_API_URL` di `docker-compose.yml`

Contoh yang lebih cocok untuk local environment:

```yaml
args:
  NEXT_PUBLIC_API_URL: "http://localhost:8080"
```

## Alur Menjalankan Sistem

Urutan yang disarankan:

1. Siapkan database MySQL
2. Buat `BackEnd/.env`
3. Jalankan backend
4. Buat `FrontEnd/my-app/.env.local`
5. Jalankan frontend
6. Login dari UI
7. Gunakan dashboard sesuai role user

## Mekanisme Autentikasi

Backend menggunakan JWT.

Alur umum:

1. User login melalui `POST /api/auth/login`
2. Backend mengembalikan token
3. Frontend menyimpan token
4. Request ke endpoint yang dilindungi dikirim dengan header:

```http
Authorization: Bearer <token>
```

Endpoint yang membutuhkan autentikasi memakai middleware `AuthRequired()`.

Endpoint admin user/role juga membutuhkan `SuperadminRequired()`.

## Endpoint yang Telah Diintegrasikan

Di bawah ini adalah endpoint utama yang sudah terintegrasi di backend.

### Public endpoint

| Method | Endpoint | Keterangan |
|---|---|---|
| `GET` | `/api/health` | Cek status backend |
| `POST` | `/api/auth/login` | Login admin |
| `GET` | `/api/web/review` | Proxy data review website |
| `GET` | `/api/web/sosmed` | Proxy statistik sosial media |
| `GET` | `/api/web/sosmed/engagement` | Proxy engagement sosial media |
| `GET` | `/api/web/visitor` | Proxy statistik visitor website |
| `GET` | `/api/web/social-clicks` | Proxy klik ikon sosial |
| `GET` | `/api/web/visitor-sessions` | Proxy data sesi pengunjung |
| `GET` | `/api/web/tiktok` | Proxy statistik TikTok |
| `GET` | `/api/web/tiktok/hit-stats` | Proxy hit stats TikTok |

### Authenticated endpoint

| Method | Endpoint | Keterangan |
|---|---|---|
| `GET` | `/api/auth/me` | Ambil profil user login |
| `GET` | `/api/auth/dashboard-keys` | Ambil katalog dashboard key |

### Admin endpoint

Butuh login + role superadmin.

| Method | Endpoint | Keterangan |
|---|---|---|
| `GET` | `/api/admin/roles` | List role |
| `POST` | `/api/admin/roles` | Tambah role |
| `PUT` | `/api/admin/roles/:id` | Ubah role |
| `DELETE` | `/api/admin/roles/:id` | Hapus role |
| `GET` | `/api/admin/users` | List user |
| `POST` | `/api/admin/users` | Tambah user |
| `PUT` | `/api/admin/users/:id` | Ubah user |
| `DELETE` | `/api/admin/users/:id` | Hapus user |

### Dashboard pasien

Butuh login.

| Method | Endpoint |
|---|---|
| `GET` | `/api/dashboard/pasien` |
| `GET` | `/api/dashboard/pasien/ringkasan` |
| `GET` | `/api/dashboard/pasien/kategori-umur` |
| `GET` | `/api/dashboard/pasien/status-perawatan` |
| `GET` | `/api/dashboard/pasien/daftar` |
| `GET` | `/api/dashboard/pasien/bpjs` |
| `GET` | `/api/dashboard/pasien/bpjs/count` |
| `GET` | `/api/dashboard/pasien/drilldown` |
| `GET` | `/api/dashboard/pasien/:no_rkm_medis` |

### Dashboard keuangan

Butuh login.

| Method | Endpoint |
|---|---|
| `GET` | `/api/dashboard/keuangan/ringkasan` |
| `GET` | `/api/dashboard/keuangan/grafik-pemasukan` |
| `GET` | `/api/dashboard/keuangan/grafik-pengeluaran` |
| `GET` | `/api/dashboard/keuangan/keuangan-total` |
| `GET` | `/api/dashboard/keuangan/pemasukan-kategori` |
| `GET` | `/api/dashboard/keuangan/histori` |
| `GET` | `/api/dashboard/keuangan/histori-pengeluaran` |
| `GET` | `/api/dashboard/keuangan/kategori-pengeluaran` |
| `GET` | `/api/dashboard/keuangan/pendapatan-akun` |
| `GET` | `/api/dashboard/keuangan/pendapatan-akun/:no_rawat/struk` |
| `GET` | `/api/dashboard/keuangan/pendapatan-akun/struk` |
| `GET` | `/api/dashboard/keuangan/ringkasan-pendapatan-laborat` |
| `GET` | `/api/dashboard/keuangan/grafik-pendapatan-laborat` |

### Dashboard diagnosa

Butuh login.

| Method | Endpoint |
|---|---|
| `GET` | `/api/dashboard/diagnosa/terbanyak` |

### Dashboard obat

Butuh login.

| Method | Endpoint |
|---|---|
| `GET` | `/api/dashboard/obat` |

### Endpoint export laporan

Butuh login.

| Method | Endpoint | Format |
|---|---|---|
| `GET` | `/api/laporan/keuangan/csv` | CSV |
| `GET` | `/api/laporan/keuangan/ringkasan/csv` | CSV |
| `GET` | `/api/laporan/keuangan/laporan-bulanan/excel` | Excel |
| `GET` | `/api/laporan/pasien/csv` | CSV |
| `GET` | `/api/laporan/pasien/ringkasan/csv` | CSV |
| `GET` | `/api/laporan/pasien/excel` | Excel |

## Integrasi Data Website dan Sosial Media

Endpoint `/api/web/*` di backend bertindak sebagai proxy ke layanan website eksternal.

Data yang saat ini terintegrasi:

- review website
- statistik sosial media
- engagement sosial media
- visitor website
- social icon clicks
- visitor sessions
- statistik TikTok
- TikTok hit stats

Backend membutuhkan `X_ADMIN_KEY` agar integrasi ini bisa berjalan.

Jika `X_ADMIN_KEY` kosong atau salah, endpoint `/api/web/*` akan gagal.

## Frontend yang Mengonsumsi Endpoint

Beberapa integrasi frontend yang penting:

- `Dashboard Website` mengonsumsi endpoint `/api/web/*`
- `Dashboard Obat` mengonsumsi `/api/dashboard/obat`
- `Dashboard Laporan` mengonsumsi endpoint export laporan
- halaman login dan settings mengonsumsi endpoint auth/admin

## Troubleshooting

### Backend gagal connect database

Periksa:

- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASS`
- `DB_NAME`
- apakah service MySQL aktif

### Frontend tidak bisa memanggil API

Periksa:

- backend sudah berjalan di port yang benar
- `NEXT_PUBLIC_API_URL` sudah sesuai
- token login tersedia jika endpoint butuh autentikasi

### Endpoint `/api/web/*` gagal

Periksa:

- `X_ADMIN_KEY` sudah diisi
- layanan sumber eksternal sedang aktif
- backend punya akses internet ke endpoint sumber

### Build frontend bermasalah setelah perubahan besar

Di project ini, membersihkan cache `.next` sering membantu:

```bash
rm -rf .next
```

Untuk Windows PowerShell:

```powershell
Remove-Item -Recurse -Force .next
```

## Catatan Pengembangan

- Backend memakai `godotenv.Load()` sehingga file `.env` dibaca saat local development
- Frontend membaca API base URL dari `NEXT_PUBLIC_API_URL`
- Middleware CORS backend saat ini masih mengizinkan semua origin
- Sebagian endpoint backend dilindungi JWT, sebagian endpoint website bersifat public

## Saran Keamanan

- Jangan commit file `.env` berisi secret asli
- Ganti `JWT_SECRET` dengan nilai yang kuat di production
- Batasi CORS di production
- Simpan `X_ADMIN_KEY` hanya di environment server

## Perintah Cepat

### Backend

```bash
cd BackEnd
go run main.go
```

### Frontend

```bash
cd FrontEnd/my-app
npm install
npm run dev
```

### Docker

```bash
docker compose up --build
```

## Lisensi

Belum ditentukan.
