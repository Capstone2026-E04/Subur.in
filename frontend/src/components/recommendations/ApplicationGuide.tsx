"use client";

import { useEffect } from "react";
import { MdOutlineSpa, MdSchedule, MdWaterDrop } from "react-icons/md";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { DeviceRecommendation } from "@/types/device";
import PhCorrectionStatus from "./PhCorrectionStatus";

interface ApplicationGuideProps {
  recommendation: DeviceRecommendation | null;
}

export default function ApplicationGuide({
  recommendation,
}: ApplicationGuideProps) {
  useEffect(() => {
    let frame: number | null = null;
    let followTarget = true;
    let disposed = false;

    const scrollToGuide = () => {
      const id = window.location.hash.slice(1);
      if (!followTarget || (id !== "panduan-air" && id !== "panduan-ph"))
        return;

      const target = document.getElementById(id);
      const container = target?.closest("main");
      if (!target || !container) return;

      const margin =
        parseFloat(window.getComputedStyle(target).scrollMarginTop) || 0;
      const top =
        container.scrollTop +
        target.getBoundingClientRect().top -
        container.getBoundingClientRect().top -
        margin;
      container.scrollTo({ top: Math.max(0, top), behavior: "instant" });
    };

    const scheduleScroll = () => {
      if (disposed || !followTarget) return;
      if (frame !== null) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = null;
        scrollToGuide();
      });
    };
    const handleHashChange = () => {
      followTarget = true;
      scheduleScroll();
    };
    const stopFollowing = () => {
      followTarget = false;
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        [
          "ArrowUp",
          "ArrowDown",
          "PageUp",
          "PageDown",
          "Home",
          "End",
          " ",
        ].includes(event.key)
      )
        stopFollowing();
    };

    const container = document
      .getElementById("panduan-air")
      ?.closest("main");
    const observer = new ResizeObserver(scheduleScroll);
    if (container) {
      observer.observe(container);
      if (container.firstElementChild)
        observer.observe(container.firstElementChild);
      container.addEventListener("wheel", stopFollowing, { passive: true });
      container.addEventListener("touchstart", stopFollowing, {
        passive: true,
      });
      container.addEventListener("pointerdown", stopFollowing);
    }
    scheduleScroll();
    document.fonts.ready.then(scheduleScroll);
    window.addEventListener("hashchange", handleHashChange);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      disposed = true;
      stopFollowing();
      observer.disconnect();
      container?.removeEventListener("wheel", stopFollowing);
      container?.removeEventListener("touchstart", stopFollowing);
      container?.removeEventListener("pointerdown", stopFollowing);
      window.removeEventListener("hashchange", handleHashChange);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card id="panduan-air" className="scroll-mt-6 overflow-hidden">
        <CardHeader className="py-4">
          <h3 className="flex items-center gap-2 text-sm font-bold text-sky-800">
            <MdWaterDrop size={20} /> Panduan air
          </h3>
        </CardHeader>
        <CardContent className="space-y-4 text-xs leading-relaxed text-neutral-600">
          {recommendation ? (
            <div className="rounded-xl bg-sky-50 p-4 text-sky-900">
              <p className="font-semibold">
                {recommendation.reduceWatering
                  ? "Hentikan penyiraman sementara"
                  : recommendation.waterVolumeLiter > 0
                    ? `Estimasi penyiraman: ${Math.round(recommendation.waterVolumeLiter * 1000)} mL`
                    : "Tidak ada tambahan air pada rekomendasi ini"}
              </p>
              <p className="mt-2">{recommendation.actionText}</p>
            </div>
          ) : (
            <p>
              Takaran penyiraman ditampilkan setelah rekomendasi perangkat
              tersedia.
            </p>
          )}
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              Periksa tindakan dan estimasi volume pada rekomendasi perangkat.
              Jangan menambah air bila status meminta penghentian penyiraman.
            </li>
            <li>
              Jika penyiraman direkomendasikan, siram perlahan sesuai estimasi
              volume. Hentikan bila air sudah menetes keluar.
            </li>
            <li>
              Lanjutkan pemantauan kelembapan dan ikuti pembaruan rekomendasi
              sebelum menyiram lagi.
            </li>
          </ol>
          <p className="flex items-start gap-2 rounded-xl bg-sky-50 p-4 text-sky-900">
            <MdSchedule size={18} className="shrink-0" /> Keputusan air otomatis
            memakai siklus empat jam dengan median pembacaan kelembapan. Jadwal
            keputusan berikutnya belum tersedia.
          </p>
        </CardContent>
      </Card>
      <Card id="panduan-ph" className="scroll-mt-6 overflow-hidden">
        <CardHeader className="py-4">
          <h3 className="text-primary flex items-center gap-2 text-sm font-bold">
            <MdOutlineSpa size={20} /> Panduan pH
          </h3>
        </CardHeader>
        <CardContent className="space-y-4 text-xs leading-relaxed text-neutral-600">
          <p>
            Periksa bahan, estimasi takaran, dan status koreksi sebelum
            memberikan perawatan.
          </p>
          {recommendation ? (
            <div className="bg-primary/5 text-primary rounded-xl p-4">
              <p className="font-semibold">
                {recommendation.phAction === "LIME"
                  ? "Dolomit untuk menaikkan pH"
                  : recommendation.phAction === "SULFUR"
                    ? "Sulfur elemental untuk menurunkan pH"
                    : "Tidak ada bahan koreksi pH yang direkomendasikan"}
              </p>
              {recommendation.phAction !== "NONE" && (
                <p className="mt-2">
                  Estimasi takaran:{" "}
                  {(recommendation.phAction === "LIME"
                    ? recommendation.limeDosageGram
                    : recommendation.sulfurDosageGram
                  ).toLocaleString("id-ID", { maximumFractionDigits: 1 })}{" "}
                  gram. Ikuti status koreksi sebelum menggunakan bahan.
                </p>
              )}
            </div>
          ) : (
            <p>
              Bahan dan takaran ditampilkan setelah rekomendasi perangkat
              tersedia.
            </p>
          )}
          <section className="rounded-xl border border-neutral-200 p-4">
            <h4 className="text-sm font-semibold text-neutral-800">
              Sebelum tanam: persiapan media
            </h4>
            <p className="mt-3">
              Bahan dicampur merata saat persiapan media sebelum tanam. Periksa
              pH media sebelum penanaman. Dosis awal persiapan media ditetapkan
              terpisah; jangan memakai dosis susulan fuzzy sebagai dosis awal
              pra-tanam.
            </p>
          </section>
          <section className="border-primary/10 bg-primary/5 rounded-xl border p-4">
            <h4 className="text-primary text-sm font-semibold">
              Saat tanaman sudah ditanam: top dressing
            </h4>
            <ol className="mt-3 list-decimal space-y-2 pl-5">
              <li>
                Periksa status koreksi pH dan estimasi dosis yang tersedia. Jika
                ditunda, ikuti status tersebut.
              </li>
              <li>
                Tabur dolomit atau sulfur merata di permukaan media, jauh dari
                batang dan daun, lalu siram. Campur dangkal hanya bila tidak
                merusak akar.
              </li>
              <li>
                Pantau pH pada kedalaman yang sama sebelum memberi dosis ulang.
              </li>
            </ol>
          </section>
          {recommendation && (
            <PhCorrectionStatus
              phAction={recommendation.phAction}
              correction={recommendation.phCorrection}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
