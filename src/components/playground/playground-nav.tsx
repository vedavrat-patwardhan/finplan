"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface NavSection {
  id: string;
  label: string;
}

interface NavGroup {
  label: string;
  sections: NavSection[];
}

export const PLAYGROUND_NAV_GROUPS: NavGroup[] = [
  {
    label: "foundation",
    sections: [
      { id: "colors", label: "Colors" },
      { id: "typography", label: "Typography" },
      { id: "plunk", label: "Plunk" },
    ],
  },
  {
    label: "components",
    sections: [
      { id: "buttons", label: "Buttons" },
      { id: "tags", label: "Tags" },
      { id: "inputs", label: "Inputs" },
      { id: "checkbox-switch", label: "Checkbox & switch" },
      { id: "tabs", label: "Tabs" },
      { id: "cards", label: "Cards" },
      { id: "overlays", label: "Overlays" },
      { id: "progress-skeleton", label: "Progress & skeleton" },
      { id: "table", label: "Table" },
      { id: "toasts", label: "Toasts" },
      { id: "stats-panels", label: "Stats & panels" },
      { id: "avatar-separator", label: "Avatar & separator" },
    ],
  },
];

const ALL_SECTIONS = PLAYGROUND_NAV_GROUPS.flatMap((group) => group.sections);

export function PlaygroundNav() {
  const [active, setActive] = useState<string>(ALL_SECTIONS[0]!.id);

  useEffect(() => {
    const elements = ALL_SECTIONS.map((section) =>
      document.getElementById(section.id)
    ).filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          setActive(visible[0].target.id);
        }
      },
      { rootMargin: "-15% 0px -70% 0px", threshold: 0 }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* Desktop rail */}
      <nav
        aria-label="Playground sections"
        className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-60 shrink-0 overflow-y-auto border-r border-border bg-sidebar p-4 md:block"
      >
        {PLAYGROUND_NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-6 last:mb-0">
            <p className="np-caps px-3 pb-2 text-faint">{group.label}</p>
            <ul className="space-y-0.5">
              {group.sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className={cn(
                      "block border-l-[3px] border-transparent px-3 py-1.5 text-[13px] font-semibold text-muted-foreground transition-colors hover:text-foreground",
                      active === section.id && "border-brand text-foreground"
                    )}
                  >
                    {section.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Mobile row */}
      <nav
        aria-label="Playground sections"
        className="sticky top-14 z-30 flex gap-4 overflow-x-auto border-b border-border bg-background px-4 py-3 md:hidden"
      >
        {ALL_SECTIONS.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className={cn(
              "np-caps shrink-0 whitespace-nowrap text-muted-foreground transition-colors",
              active === section.id && "text-foreground"
            )}
          >
            {section.label}
          </a>
        ))}
      </nav>
    </>
  );
}
