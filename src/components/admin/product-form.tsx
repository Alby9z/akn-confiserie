import { centsToInput } from "@/lib/money";
import { inputCls, L, Panel, textareaCls, btnCls } from "./ui";

type P = {
  id?: string;
  name?: string;
  slug?: string;
  description?: string;
  priceCents?: number;
  compareAtPriceCents?: number | null;
  packaging?: string | null;
  netWeightGrams?: number | null;
  categoryId?: string | null;
  isActive?: boolean;
  isFeatured?: boolean;
  ingredients?: string | null;
  allergens?: string | null;
  mayContain?: string | null;
  nutrition?: string | null;
  storageInfo?: string | null;
  origin?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
};

export function ProductForm({ product, categories, action, isNew }: { product?: P; categories: { id: string; name: string }[]; action: (fd: FormData) => Promise<void>; isNew?: boolean }) {
  const p = product ?? {};
  return (
    <form action={action} className="space-y-6">
      {p.id && <input type="hidden" name="id" value={p.id} />}
      <Panel title="Informations principales">
        <div className="grid gap-4 md:grid-cols-2">
          <L label="Nom du produit *"><input name="name" required defaultValue={p.name} maxLength={120} className={inputCls} /></L>
          <L label="Adresse de la page (slug)" hint="Laissez vide pour la générer à partir du nom. Un changement crée une redirection automatique."><input name="slug" defaultValue={p.slug} maxLength={80} className={inputCls} /></L>
          <L label="Catégorie">
            <select name="categoryId" defaultValue={p.categoryId ?? ""} className={inputCls}>
              <option value="">Sans catégorie</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </L>
          <L label="Conditionnement" hint="Ex. : Sachet 200 g, À l'unité, Boîte de 12"><input name="packaging" defaultValue={p.packaging ?? ""} maxLength={80} className={inputCls} /></L>
          <L label="Prix TTC (€) *" hint="Ex. : 4,90"><input name="price" required inputMode="decimal" defaultValue={p.priceCents != null ? centsToInput(p.priceCents) : ""} className={inputCls} /></L>
          <L label="Ancien prix TTC (€)" hint="Uniquement pour une vraie promotion : prix pratiqué avant la baisse. Laissez vide sinon."><input name="compareAtPrice" inputMode="decimal" defaultValue={centsToInput(p.compareAtPriceCents)} className={inputCls} /></L>
          <L label="Poids net (grammes)" hint="Sert à afficher le prix au kilo."><input name="netWeightGrams" type="number" min={1} defaultValue={p.netWeightGrams ?? ""} className={inputCls} /></L>
          {isNew && <L label="Stock initial"><input name="initialStock" type="number" min={0} defaultValue={0} className={inputCls} /></L>}
        </div>
        <L label="Description" className="mt-4"><textarea name="description" rows={5} defaultValue={p.description} maxLength={5000} className={textareaCls} /></L>
        <div className="mt-4 flex flex-wrap gap-6 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" name="isActive" defaultChecked={p.isActive ?? true} className="accent-laque" /> Visible sur le site</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="isFeatured" defaultChecked={p.isFeatured} className="accent-laque" /> Mis en avant sur l&apos;accueil</label>
        </div>
      </Panel>
      <Panel title="Informations alimentaires">
        <p className="mb-4 text-sm text-slate-600">Recopiez uniquement les informations fournies par le fournisseur (étiquette, fiche technique). Ne rien inventer : laissez vide si l&apos;information n&apos;est pas connue.</p>
        <div className="grid gap-4 md:grid-cols-2">
          <L label="Ingrédients"><textarea name="ingredients" defaultValue={p.ingredients ?? ""} className={textareaCls} /></L>
          <L label="Allergènes"><textarea name="allergens" defaultValue={p.allergens ?? ""} className={textareaCls} /></L>
          <L label="Peut contenir des traces de"><textarea name="mayContain" defaultValue={p.mayContain ?? ""} className={textareaCls} /></L>
          <L label="Valeurs nutritionnelles"><textarea name="nutrition" defaultValue={p.nutrition ?? ""} className={textareaCls} /></L>
          <L label="Conservation"><input name="storageInfo" defaultValue={p.storageInfo ?? ""} className={inputCls} /></L>
          <L label="Origine"><input name="origin" defaultValue={p.origin ?? ""} className={inputCls} /></L>
        </div>
      </Panel>
      <Panel title="Référencement (facultatif)">
        <div className="grid gap-4 md:grid-cols-2">
          <L label="Titre pour Google" hint="70 caractères maximum. Par défaut : nom du produit."><input name="seoTitle" defaultValue={p.seoTitle ?? ""} maxLength={70} className={inputCls} /></L>
          <L label="Description pour Google" hint="170 caractères maximum."><textarea name="seoDescription" defaultValue={p.seoDescription ?? ""} maxLength={170} className={textareaCls} /></L>
        </div>
      </Panel>
      <button type="submit" className={btnCls}>{isNew ? "Créer le produit" : "Enregistrer"}</button>
    </form>
  );
}
