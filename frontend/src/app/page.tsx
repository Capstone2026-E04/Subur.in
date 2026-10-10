import Image from "next/image";
import Link from "next/link";
import {
  MdArrowForward,
  MdNotificationsActive,
  MdWarningAmber,
} from "react-icons/md";
import HeroPreview from "@/components/landing/HeroPreview";
import LandingMotion from "@/components/landing/LandingMotion";

const STEPS = [
  {
    title: "Pasang sensor",
    body: "Tancapkan probe pH dan kelembapan ke polybag. Alat ESP32 mengirim pembacaan lewat MQTT.",
  },
  {
    title: "Baca kondisi media",
    body: "Sistem menilai pH dan kelembapan (NMI) memakai batas tiap tanaman, bukan satu angka untuk semua.",
  },
  {
    title: "Ikuti rekomendasi",
    body: "Anda menerima takaran air, dolomit, atau sulfur, lengkap dengan alasan bila koreksi ditunda.",
  },
];

const PLANTS = [
  { name: "Selada", trigger: 65 },
  { name: "Bayam", trigger: 70 },
  { name: "Pakcoy", trigger: 60 },
];

const ctaClass =
  "bg-primary hover:bg-primary-light focus-visible:ring-primary/40 inline-flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-6 text-sm font-bold text-white shadow-primary/20 shadow-md transition-all duration-200 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none";

export default function Home() {
  return (
    <LandingMotion className="flex min-h-[100dvh] flex-col">
      <header className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/logo/logo-suburin.svg" alt="" width={36} height={36} />
          <span className="text-primary text-lg font-bold tracking-tight">
            Subur.in
          </span>
        </Link>
        <Link href="/login" className={ctaClass}>
          Mulai pantau
        </Link>
      </header>

      <section className="mx-auto grid min-h-[calc(100dvh-4rem)] w-full max-w-7xl grid-cols-1 items-center gap-12 px-4 pt-10 pb-16 sm:px-8 md:grid-cols-12 md:pt-12">
        <div className="space-y-6 md:col-span-7 md:pr-6">
          <h1
            data-hero="title"
            className="text-4xl leading-[1.05] font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl"
          >
            Tahu kapan menyiram, tanpa menebak.
          </h1>
          <p
            data-hero="body"
            className="max-w-[48ch] text-base leading-relaxed text-gray-700"
          >
            Sensor pH dan kelembapan di polybag mengirim data ke dashboard, lalu
            sistem menghitung air dan koreksi pH yang pas.
          </p>
          <div data-hero="actions" className="flex flex-wrap gap-3">
            <Link href="/login" className={ctaClass}>
              Mulai pantau
              <MdArrowForward size={18} />
            </Link>
            <a
              href="#cara-kerja"
              className="focus-visible:ring-primary/40 text-primary inline-flex min-h-12 items-center justify-center rounded-xl border border-black/12 bg-white/60 px-6 text-sm font-bold whitespace-nowrap transition-colors hover:bg-white focus-visible:ring-2 focus-visible:outline-none"
            >
              Cara kerja
            </a>
          </div>
        </div>

        <div
          data-hero="preview"
          className="flex justify-center md:col-span-5 md:justify-end"
        >
          <HeroPreview />
        </div>
      </section>

      <section
        id="cara-kerja"
        className="mx-auto w-full max-w-7xl scroll-mt-8 px-4 py-24 sm:px-8"
      >
        <div data-reveal>
          <h2 className="text-primary max-w-[22ch] text-3xl leading-tight font-extrabold tracking-tight md:text-4xl">
            Dari sensor sampai takaran dalam tiga langkah.
          </h2>
        </div>

        <ol
          data-steps
          className="border-primary/20 relative mt-12 space-y-10 border-l-2 pl-6 md:pl-10"
        >
          <span
            data-steps-line
            aria-hidden="true"
            className="bg-primary absolute top-0 -left-[2px] h-full w-0.5"
          />
          {STEPS.map((step, i) => (
            <li
              key={step.title}
              data-step
              className={i === 1 ? "md:ml-24" : i === 2 ? "md:ml-48" : ""}
            >
              <h3 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
                {step.title}
              </h3>
              <p className="mt-2 max-w-[52ch] text-base leading-relaxed text-gray-700">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-24 sm:px-8">
        <div data-reveal>
          <h2 className="text-primary max-w-[20ch] text-3xl leading-tight font-extrabold tracking-tight md:text-4xl">
            Rekomendasi yang bisa dijelaskan.
          </h2>
          <p className="mt-4 max-w-[56ch] text-base leading-relaxed text-gray-700">
            Setiap saran punya dasar yang bisa Anda baca: batas tanaman, status
            kelembapan, dan aturan keamanan koreksi pH.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-6">
          <div
            data-reveal
            className="bg-primary rounded-2xl p-8 text-white md:col-span-4"
          >
            <p className="text-sm font-semibold text-white/80">
              Air secukupnya
            </p>
            <p className="mt-3 text-6xl font-extrabold tracking-tight">
              <span data-count="160">160</span> mL
            </p>
            <p className="mt-4 max-w-[48ch] text-base leading-relaxed text-white/90">
              Selada di NMI 50 butuh 160 mL. Di NMI 65 sistem tidak menyarankan
              siram, karena kelembapan masih dalam batas yang wajar.
            </p>
          </div>

          <div
            data-reveal
            className="rounded-2xl border border-amber-200 bg-amber-50 p-8 md:col-span-2"
          >
            <MdWarningAmber size={28} className="text-amber-700" />
            <h3 className="mt-4 text-lg font-bold text-amber-950">
              Koreksi ditunda saat media basah
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-amber-900">
              Dolomit dan sulfur tidak disarankan ketika media basah, dan baru
              muncul lagi 14 hari setelah koreksi terakhir.
            </p>
          </div>

          <div
            data-reveal
            className="rounded-2xl border border-black/8 bg-white p-8 md:col-span-2"
          >
            <h3 className="text-lg font-bold text-gray-900">
              Batas siram tiap tanaman
            </h3>
            <dl className="mt-5 grid grid-cols-3 gap-2">
              {PLANTS.map((plant) => (
                <div key={plant.name}>
                  <dd className="text-primary text-3xl font-extrabold tracking-tight">
                    {plant.trigger}
                  </dd>
                  <dt className="mt-1 text-xs font-semibold text-gray-600">
                    {plant.name}
                  </dt>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-xs leading-relaxed text-gray-600">
              Angka NMI, bukan persen kadar air.
            </p>
          </div>

          <div
            data-reveal
            className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-emerald-50 p-8 md:col-span-4"
          >
            <MdNotificationsActive size={28} className="text-sky-700" />
            <h3 className="mt-4 text-lg font-bold text-gray-900">
              Peringatan sampai ke Telegram
            </h3>
            <p className="mt-2 max-w-[52ch] text-base leading-relaxed text-gray-700">
              Dapat kabar saat media terlalu kering atau basah, dan saat pH
              keluar dari rentang tanaman, tanpa membuka dashboard.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-primary">
        <div
          data-reveal
          className="mx-auto flex w-full max-w-7xl flex-col items-start gap-6 px-4 py-20 sm:px-8 md:flex-row md:items-center md:justify-between"
        >
          <div className="max-w-[56ch] space-y-3">
            <h2 className="text-3xl leading-tight font-extrabold tracking-tight text-balance text-white md:text-4xl">
              Hubungkan alat pertama Anda.
            </h2>
            <p className="text-base leading-relaxed text-white/90">
              Masuk dengan akun Google, daftarkan alat, dan data pertama muncul
              dalam beberapa menit.
            </p>
          </div>
          <Link
            href="/login"
            className="text-primary focus-visible:ring-offset-primary inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-bold whitespace-nowrap transition-all duration-200 hover:bg-[#fbf5dd] focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.98]"
          >
            Mulai pantau
            <MdArrowForward size={18} />
          </Link>
        </div>
      </section>

      <footer className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-xs text-gray-600 sm:px-8">
        <span>&copy; {new Date().getFullYear()} Subur.in</span>
        <span>Capstone2026-E04</span>
      </footer>
    </LandingMotion>
  );
}
