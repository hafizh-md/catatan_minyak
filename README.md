# Catatan Minyak & BBM (Next.js + Firebase + Vercel)

Aplikasi pencatatan manajemen **Kantong Modal Minyak**, pembagian subsidi sekali ngisi (misal Rp 40.000/isi), pemisahan **Uang Harian**, pilihan cepat jenis BBM (**Pertalite Rp 10.000**, **Pertamax Rp 16.300**, **Pertamax Turbo Rp 20.000**), serta perhitungan otomatis **Jarak Tempuh (KM)** dan **Rata-rata Konsumsi (`km/L`)**.

---

## Cara Menjalankan di Komputer (Lokal)

```bash
npm run dev
```

Lalu buka [http://localhost:3000](http://localhost:3000) di browser.
*(Secara default, aplikasi sudah bisa langsung dipakai menggunakan penyimpanan lokal browser dan sudah terisi contoh skenario: Modal Rp 1.000.000, Isi ke-1 Rp 65.000 di KM 200, dan Isi ke-2 Rp 75.000 di KM 392).*

---

## Cara Menghubungkan ke Firebase (Cloud Firestore Gratis)

1. Buka [Firebase Console](https://console.firebase.google.com/) dan klik **Create a project**.
2. Masuk ke menu **Build > Firestore Database** lalu klik **Create database** (pilih lokasi `asia-southeast2 (Jakarta)`).
3. Masuk ke tab **Rules** di Firestore Database, lalu ubah menjadi:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if true;
       }
     }
   }
   ```
   Klik **Publish**.
4. Buka **Project Settings** (ikon gerigi di kiri atas) > gulir ke bawah ke **Your apps** > pilih ikon Web (`</>`).
5. Salin nilai konfigurasi Firebase kamu ke dalam file baru bernama `.env.local` (salin formatnya dari [`.env.example`](file:///d:/portofolio/catatan_minyak/.env.example)):
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=nama-project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=nama-project
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=nama-project.firebasestorage.app
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
   NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
   ```

---

## Cara Hosting ke Vercel

1. Upload (push) proyek ini ke repositori **GitHub**.
2. Buka [Vercel](https://vercel.com/) > **Add New Project** > pilih repositori GitHub tersebut.
3. Pada bagian **Environment Variables**, masukkan 6 variabel dari `.env.local` di atas.
4. Klik **Deploy**.

