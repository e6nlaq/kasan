import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>
          語義データ:{" "}
          <a
            href="https://en.wiktionary.org"
            className="underline underline-offset-3 hover:text-foreground"
            target="_blank"
            rel="noreferrer"
          >
            English Wiktionary
          </a>{" "}
          (CC BY-SA 4.0) /{" "}
          <a
            href="https://www.wikidata.org"
            className="underline underline-offset-3 hover:text-foreground"
            target="_blank"
            rel="noreferrer"
          >
            Wikidata
          </a>{" "}
          (CC0)
        </p>
        <p className="flex gap-3">
          <Link to="/licenses" className="underline underline-offset-3 hover:text-foreground">
            ライセンス
          </Link>
          <Link to="/about" className="underline underline-offset-3 hover:text-foreground">
            このサイトについて
          </Link>
        </p>
      </div>
    </footer>
  );
}
