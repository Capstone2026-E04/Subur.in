"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

interface LandingMotionProps {
  children: React.ReactNode;
  className?: string;
}

export default function LandingMotion({
  children,
  className,
}: LandingMotionProps) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const heroTimeline = gsap.timeline({
          defaults: { ease: "power3.out", duration: 0.7 },
        });
        heroTimeline
          .from("[data-hero='title']", { y: 28, opacity: 0 })
          .from("[data-hero='body']", { y: 20, opacity: 0 }, "-=0.45")
          .from("[data-hero='actions']", { y: 16, opacity: 0 }, "-=0.45")
          .from(
            "[data-hero='preview']",
            { y: 40, opacity: 0, scale: 0.97, duration: 0.9 },
            "-=0.7",
          );

        gsap.set("[data-reveal]", { opacity: 0, y: 24 });
        ScrollTrigger.batch("[data-reveal]", {
          start: "top 88%",
          once: true,
          onEnter: (elements) =>
            gsap.to(elements, {
              opacity: 1,
              y: 0,
              duration: 0.7,
              stagger: 0.12,
              ease: "power3.out",
              overwrite: true,
            }),
        });

        gsap.fromTo(
          "[data-steps-line]",
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: "none",
            transformOrigin: "top",
            scrollTrigger: {
              trigger: "[data-steps]",
              start: "top 70%",
              end: "bottom 60%",
              scrub: 0.6,
            },
          },
        );

        gsap.utils.toArray<HTMLElement>("[data-step]").forEach((step) => {
          gsap.fromTo(
            step,
            { opacity: 0.3 },
            {
              opacity: 1,
              ease: "none",
              scrollTrigger: {
                trigger: step,
                start: "top 78%",
                end: "top 55%",
                scrub: true,
              },
            },
          );
        });

        gsap.utils.toArray<HTMLElement>("[data-count]").forEach((el) => {
          const target = Number(el.dataset.count);
          const counter = { value: 0 };
          gsap.to(counter, {
            value: target,
            duration: 1.2,
            ease: "power2.out",
            scrollTrigger: { trigger: el, start: "top 85%", once: true },
            onUpdate: () => {
              el.textContent = String(Math.round(counter.value));
            },
          });
        });

        document.fonts?.ready.then(() => ScrollTrigger.refresh());
      });

      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <main ref={root} className={className}>
      {children}
    </main>
  );
}
