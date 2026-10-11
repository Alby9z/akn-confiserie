import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ConsentProvider } from "@/components/layout/consent";
import { CartProvider } from "@/components/shop/cart-provider";
import { getActiveCategories } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const [session, categories, settings] = await Promise.all([getSession(), getActiveCategories(), getSettings()]);
  return (
    <ConsentProvider>
      <CartProvider userId={session?.user.id ?? null}>
        <Header categories={categories.map((c) => ({ name: c.name, slug: c.slug }))} isLoggedIn={Boolean(session)} announcement={settings.announcement} />
        <main id="contenu" tabIndex={-1} className="outline-none">
          {children}
        </main>
        <Footer settings={settings} />
      </CartProvider>
    </ConsentProvider>
  );
}
