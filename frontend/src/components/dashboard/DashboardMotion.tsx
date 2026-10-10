"use client";

import { useRef } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

interface DashboardMotionProps {
  children: React.ReactNode;
  className?: string;
}

const REVEAL = "[data-reveal]";

export default function DashboardMotion({
  children,
  className,
}: DashboardMotionProps) {
  const root = useRef<HTMLElement>(null);
  const pathname = usePathname();

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const reveal = (nodes: Element[]) => {
          const fresh = nodes.filter(
            (el) =>
              !(el as HTMLElement).dataset.revealed &&
              !el.parentElement?.closest(REVEAL),
          );
          if (fresh.length === 0) return;
          fresh.forEach((el) => {
            (el as HTMLElement).dataset.revealed = "1";
          });
          gsap.fromTo(
            fresh,
            { opacity: 0, y: 16 },
            {
              opacity: 1,
              y: 0,
              duration: 0.55,
              stagger: 0.07,
              ease: "power3.out",
              clearProps: "transform,opacity",
              overwrite: "auto",
            },
          );
        };

        reveal(Array.from(root.current?.querySelectorAll(REVEAL) ?? []));

        const observer = new MutationObserver((mutations) => {
          const added: Element[] = [];
          mutations.forEach((m) =>
            m.addedNodes.forEach((node) => {
              if (!(node instanceof Element)) return;
              if (node.matches(REVEAL)) added.push(node);
              added.push(...Array.from(node.querySelectorAll(REVEAL)));
            }),
          );
          reveal(added);
        });
        observer.observe(root.current as Element, {
          childList: true,
          subtree: true,
        });

        return () => observer.disconnect();
      });

      return () => mm.revert();
    },
    { scope: root, dependencies: [pathname], revertOnUpdate: true },
  );

  return (
    <main ref={root} className={className}>
      {children}
    </main>
  );
}
