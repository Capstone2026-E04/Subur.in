import Link from "next/link";
import {
  MdOutlineSpa,
  MdWaterDrop,
  MdAutoAwesome,
  MdNotificationsActive,
  MdArrowForward,
} from "react-icons/md";

const features = [
  {
    icon: MdWaterDrop,
    title: "Pantau pH & Kelembapan Real-Time",
    description:
      "Sensor ESP32 mengirim kondisi tanah setiap beberapa menit, langsung terlihat di dashboard Anda.",
  },
  {
    icon: MdAutoAwesome,
    title: "Rekomendasi Perawatan Otomatis",
    description:
      "AI Subur.in menghitung takaran air, kapur, dan sulfur yang tepat sesuai kebutuhan tanaman Anda.",
  },
  {
    icon: MdNotificationsActive,
    title: "Notifikasi Langsung ke Telegram",
    description:
      "Dapat peringatan begitu tanah terlalu kering, basah, atau pH-nya keluar dari rentang aman.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="flex items-center gap-2.5 px-6 py-5 sm:px-10">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white shadow-sm">
          <MdOutlineSpa size={19} />
        </div>
        <span className="text-lg font-bold tracking-tight text-primary">
          Subur.in
        </span>
      </header>

      <section className="flex-1 flex flex-col items-center justify-center gap-10 px-6 py-12 text-center sm:px-10">
        <div className="max-w-xl space-y-4">
          <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            Monitoring Tanaman berbasis IoT & AI
          </span>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-gray-800 leading-tight">
            Rawat Tanaman Lebih Mudah dengan{" "}
            <span className="text-primary">Subur.in</span>
          </h1>
          <p className="text-sm sm:text-base text-gray-500 leading-relaxed">
            Subur.in memantau pH dan kelembapan tanah kebun Anda secara real-time,
            lalu memberi rekomendasi perawatan otomatis lewat AI — tanpa perlu jadi ahli tanaman.
          </p>
          <div className="pt-2">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-light transition-all shadow-md shadow-primary/15"
            >
              Mulai Sekarang
              <MdArrowForward size={18} />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl w-full">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="flex flex-col items-center text-center gap-3 rounded-2xl border border-black/8 bg-white p-6 shadow-sm"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <feature.icon size={22} />
              </div>
              <p className="text-sm font-bold text-gray-800">{feature.title}</p>
              <p className="text-xs text-gray-500 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <footer className="px-6 py-5 text-center text-xs text-gray-400 sm:px-10">
        &copy; {new Date().getFullYear()} Subur.in
      </footer>
    </main>
  );
}
