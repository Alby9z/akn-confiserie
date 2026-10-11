import { requireAdmin } from "@/lib/session";
import { AdminPage, btnCls, btnSecondaryCls, inputCls, L, Panel, textareaCls } from "@/components/admin/ui";
import { deleteFaq, saveFaq, saveSettings } from "@/app/admin/_actions/content";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { centsToInput } from "@/lib/money";

export const metadata = { title: "Contenus et paramètres" };

export default async function Content({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  await requireAdmin();
  const [s, faqs] = await Promise.all([getSettings(), db.faq.findMany({ orderBy: { position: "asc" } })]);
  return (
    <AdminPage title="Contenus et paramètres" searchParams={await searchParams}>
      <form action={saveSettings} className="space-y-6">
        <Panel title="Boutique et coordonnées">
          <div className="grid gap-4 md:grid-cols-2">
            <L label="Nom commercial"><input name="shopName" defaultValue={s.shopName} className={inputCls} /></L>
            <L label="Interlocutrice affichée (page Contact)"><input name="contactName" defaultValue={s.contactName ?? ""} className={inputCls} /></L>
            <L label="Téléphone"><input name="phone" defaultValue={s.phone ?? ""} className={inputCls} /></L>
            <L label="E-mail professionnel" hint="Affiché sur le site. Laissez vide tant qu'il n'est pas confirmé."><input name="email" type="email" defaultValue={s.email ?? ""} className={inputCls} /></L>
            <L label="Adresse"><input name="addressLine" defaultValue={s.addressLine ?? ""} className={inputCls} /></L>
            <div className="grid grid-cols-[8rem_1fr] gap-3">
              <L label="Code postal"><input name="postalCode" defaultValue={s.postalCode ?? ""} className={inputCls} /></L>
              <L label="Ville"><input name="city" defaultValue={s.city ?? ""} className={inputCls} /></L>
            </div>
            <L label="Horaires d'ouverture" hint="Une ligne par jour, ex. « Mardi – samedi : 10 h – 19 h ». Vide = non affichés."><textarea name="openingHours" defaultValue={s.openingHours ?? ""} className={textareaCls} /></L>
            <div className="grid grid-cols-2 gap-3">
              <L label="Latitude (carte)" hint="Depuis OpenStreetMap : clic droit sur la boutique → « Afficher l'adresse »."><input name="mapLatitude" defaultValue={s.mapLatitude ?? ""} className={inputCls} /></L>
              <L label="Longitude (carte)"><input name="mapLongitude" defaultValue={s.mapLongitude ?? ""} className={inputCls} /></L>
            </div>
            <L label="Instagram (lien)"><input name="instagramUrl" defaultValue={s.instagramUrl ?? ""} placeholder="https://" className={inputCls} /></L>
            <L label="Facebook (lien)"><input name="facebookUrl" defaultValue={s.facebookUrl ?? ""} placeholder="https://" className={inputCls} /></L>
          </div>
        </Panel>
        <Panel title="Textes du site">
          <div className="grid gap-4 md:grid-cols-2">
            <L label="Titre d'accueil" hint="Vide = texte par défaut"><input name="heroTitle" defaultValue={s.heroTitle ?? ""} maxLength={120} className={inputCls} /></L>
            <L label="Bandeau d'annonce" hint="Affiché en haut de toutes les pages. Vide = masqué."><input name="announcement" defaultValue={s.announcement ?? ""} maxLength={160} className={inputCls} /></L>
            <L label="Texte d'accueil" className="md:col-span-2"><textarea name="heroText" defaultValue={s.heroText ?? ""} maxLength={400} className={textareaCls} /></L>
            <L label="Présentation de la boutique (page « La boutique »)" className="md:col-span-2"><textarea name="aboutText" rows={6} defaultValue={s.aboutText ?? ""} className={textareaCls} /></L>
            <L label="Délai de réponse aux demandes" hint="Ex. « Nous vous répondons sous 24 h ouvrées. » N'indiquez qu'un délai que vous pouvez tenir. Vide = aucune promesse." className="md:col-span-2"><input name="responsePromise" defaultValue={s.responsePromise ?? ""} maxLength={160} className={inputCls} /></L>
          </div>
        </Panel>
        <Panel title="Retrait et livraison">
          <p className="mb-4 text-sm text-slate-600">La commande en ligne n&apos;est ouverte que si au moins un mode est activé.</p>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <label className="flex items-center gap-2 font-medium"><input type="checkbox" name="pickupEnabled" defaultChecked={s.pickupEnabled} className="accent-laque" /> Retrait en boutique</label>
              <L label="Informations de retrait" hint="Ex. : délai de préparation, pièce à présenter."><textarea name="pickupInfo" defaultValue={s.pickupInfo ?? ""} className={textareaCls} /></L>
            </div>
            <div className="space-y-3">
              <label className="flex items-center gap-2 font-medium"><input type="checkbox" name="deliveryEnabled" defaultChecked={s.deliveryEnabled} className="accent-laque" /> Livraison</label>
              <div className="grid grid-cols-2 gap-3">
                <L label="Frais (€)"><input name="deliveryFee" defaultValue={centsToInput(s.deliveryFeeCents)} className={inputCls} /></L>
                <L label="Offerte dès (€)"><input name="freeDeliveryThreshold" defaultValue={centsToInput(s.freeDeliveryThresholdCents)} className={inputCls} /></L>
              </div>
              <L label="Informations de livraison" hint="Zone desservie, délais, transporteur."><textarea name="deliveryInfo" defaultValue={s.deliveryInfo ?? ""} className={textareaCls} /></L>
            </div>
          </div>
        </Panel>
        <button className={btnCls}>Enregistrer les paramètres</button>
      </form>

      <Panel title="Questions fréquentes">
        <form action={saveFaq} className="space-y-3 rounded-lg bg-slate-50 p-4">
          <L label="Nouvelle question"><input name="question" required className={inputCls} /></L>
          <L label="Réponse"><textarea name="answer" required className={textareaCls} /></L>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" name="isPublished" defaultChecked /> Publiée</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="showOnHome" /> Sur l&apos;accueil</label>
            <label>Ordre <input name="position" type="number" defaultValue={faqs.length} className={`${inputCls} inline-block w-20`} /></label>
          </div>
          <button className={btnSecondaryCls}>Ajouter</button>
        </form>
        <div className="mt-4 space-y-3">
          {faqs.map((f) => (
            <details key={f.id} className="rounded-lg border border-slate-200">
              <summary className="cursor-pointer p-3 text-sm font-medium">{f.question}{!f.isPublished && " (non publiée)"}</summary>
              <form action={saveFaq} className="space-y-3 border-t border-slate-100 p-3">
                <input type="hidden" name="id" value={f.id} />
                <input name="question" defaultValue={f.question} className={inputCls} aria-label="Question" />
                <textarea name="answer" defaultValue={f.answer} className={textareaCls} aria-label="Réponse" />
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <label className="flex items-center gap-2"><input type="checkbox" name="isPublished" defaultChecked={f.isPublished} /> Publiée</label>
                  <label className="flex items-center gap-2"><input type="checkbox" name="showOnHome" defaultChecked={f.showOnHome} /> Sur l&apos;accueil</label>
                  <label>Ordre <input name="position" type="number" defaultValue={f.position} className={`${inputCls} inline-block w-20`} /></label>
                </div>
                <button className={btnSecondaryCls}>Enregistrer</button>
              </form>
              <form action={deleteFaq} className="px-3 pb-3"><input type="hidden" name="id" value={f.id} /><button className="text-sm text-red-700 underline">Supprimer</button></form>
            </details>
          ))}
        </div>
      </Panel>
    </AdminPage>
  );
}
