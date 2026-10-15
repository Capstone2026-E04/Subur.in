"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  MdArrowBack,
  MdNotificationsNone,
  MdOutlineAutoAwesome,
  MdOutlineWaterDrop,
} from "react-icons/md";

gsap.registerPlugin(useGSAP);

const BENEFITS = [
  {
    icon: MdOutlineWaterDrop,
    title: "Pantau pH dan kelembapan tanah",
    description: "Data sensor tampil langsung di dashboard.",
  },
  {
    icon: MdOutlineAutoAwesome,
    title: "Rekomendasi perawatan otomatis",
    description: "Dosis air, kapur, dan sulfur dihitung untuk tiap tanaman.",
  },
  {
    icon: MdNotificationsNone,
    title: "Pemberitahuan saat perlu tindakan",
    description: "Tanah terlalu kering, basah, asam, atau basa.",
  },
];

interface AuthShellProps {
  title: string;
  description: string;
  backHref: string;
  backLabel: string;
  children: React.ReactNode;
}

export default function AuthShell({
  title,
  description,
  backHref,
  backLabel,
  children,
}: AuthShellProps) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-auth-brand]", {
          opacity: 0,
          x: -24,
          duration: 0.7,
          stagger: 0.1,
          ease: "power3.out",
          clearProps: "transform,opacity",
        });
        gsap.from("[data-auth-form] > *", {
          opacity: 0,
          y: 16,
          duration: 0.55,
          stagger: 0.06,
          delay: 0.15,
          ease: "power3.out",
          clearProps: "transform,opacity",
        });
      });

      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <main
      ref={root}
      className="grid min-h-[100dvh] bg-neutral-100 lg:grid-cols-[1.05fr_1fr]"
    >
      <aside className="bg-primary relative hidden flex-col justify-between overflow-hidden p-12 text-white lg:flex">
        <div
          aria-hidden
          className="from-primary-light/60 pointer-events-none absolute inset-0 bg-gradient-to-br via-transparent to-black/20"
        />

        <div data-auth-brand className="relative flex items-center gap-3">
          <Image
            src="/logo/logo-suburin-reverted.svg"
            alt=""
            width={40}
            height={40}
          />
          <span className="text-2xl font-bold tracking-tight text-[#f1e8a6]">
            Subur.in
          </span>
        </div>

        <div className="relative max-w-md space-y-10">
          <h2
            data-auth-brand
            className="text-4xl leading-[1.1] font-bold tracking-tight"
          >
            Tanaman sehat dimulai dari data tanah yang tepat.
          </h2>

          <ul className="space-y-6">
            {BENEFITS.map(
              ({ icon: Icon, title: benefit, description: text }) => (
                <li key={benefit} data-auth-brand className="flex gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#f5eec3]">
                    <Icon size={22} />
                  </span>
                  <div>
                    <p className="text-base font-semibold">{benefit}</p>
                    <p className="text-sm text-white/75">{text}</p>
                  </div>
                </li>
              ),
            )}
          </ul>
        </div>

        <p data-auth-brand className="relative text-sm text-white/70">
          Platform monitoring tanaman pintar
        </p>
      </aside>

      <section className="relative flex flex-col items-center justify-center px-4 py-20 sm:px-8">
        <Link
          href={backHref}
          className="hover:text-primary focus-visible:ring-primary/40 absolute top-4 left-4 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-neutral-700 transition-colors focus-visible:ring-2 focus-visible:outline-none sm:left-8"
        >
          <MdArrowBack size={16} />
          {backLabel}
        </Link>

        <div data-auth-form className="w-full max-w-sm space-y-6">
          <div className="space-y-3">
            <Image
              src="/logo/logo-suburin.svg"
              alt=""
              width={44}
              height={44}
              className="lg:hidden"
            />
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
              {title}
            </h1>
            <p className="text-sm text-neutral-700">{description}</p>
          </div>

          {children}
        </div>
      </section>
    </main>
  );
}
