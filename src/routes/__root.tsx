import { createRootRoute, Link, Outlet } from "@tanstack/react-router";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFound,
});

function RootLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:py-10">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}

function NotFound() {
  return (
    <div className="space-y-4 rounded-2xl border p-8 text-center">
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h1 className="text-2xl font-semibold">ページが見つかりません</h1>
      <p className="text-sm text-muted-foreground">
        リンクが変わったか、URL が間違っている可能性があります。
      </p>
      <Button nativeButton={false} render={<Link to="/" />}>
        ホームへ戻る
      </Button>
    </div>
  );
}
