import { Link } from "@tanstack/react-router";
import { BookOpenCheck, Info, RotateCcw, Scale } from "lucide-react";

const links = [
  { to: "/", label: "ホーム", icon: BookOpenCheck },
  { to: "/review", label: "復習", icon: RotateCcw },
  { to: "/licenses", label: "ライセンス", icon: Scale },
  { to: "/about", label: "このサイトについて", icon: Info },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <Link to="/" className="flex items-center gap-2 font-heading text-sm font-semibold">
          <span
            aria-hidden="true"
            className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground"
          >
            <Scale className="size-4" />
          </span>
          <span>可算・不可算 見分けクイズ</span>
        </Link>
        <nav aria-label="メインナビゲーション" className="ml-auto flex flex-wrap gap-1">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.to}
                to={link.to}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                activeProps={{ className: "bg-muted text-foreground" }}
                activeOptions={{ exact: link.to === "/" }}
              >
                <Icon className="size-3.5" aria-hidden="true" />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
