"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

/**
 * Gestion du consentement. Le site n'utilise par défaut AUCUN traceur publicitaire ou
 * de mesure d'audience. La seule catégorie optionnelle est « Contenus externes »
 * (carte OpenStreetMap), chargée uniquement après accord.
 */
export type Consent = { externalMedia: boolean; decidedAt: string; v: 1 };
const COOKIE = "akn-consent";
const OPEN_EVENT = "akn:open-consent";

function readConsent(): Consent | null {
  try {
    const m = document.cookie.match(/(?:^|; )akn-consent=([^;]+)/);
    if (!m) return null;
    const c = JSON.parse(decodeURIComponent(m[1]));
    return c?.v === 1 ? c : null;
  } catch {
    return null;
  }
}

function writeConsent(c: Consent) {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  // Durée maximale recommandée par la CNIL : 13 mois
  document.cookie = `${COOKIE}=${encodeURIComponent(JSON.stringify(c))}; Max-Age=${60 * 60 * 24 * 395}; Path=/; SameSite=Lax${secure}`;
}

const ConsentContext = createContext<{ consent: Consent | null; set: (externalMedia: boolean) => void; open: () => void }>({
  consent: null,
  set: () => {},
  open: () => {},
});

export function useConsent() {
  return useContext(ConsentContext);
}

export function openConsentPanel() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

const CHANGE_EVENT = "akn:consent-change";

function subscribe(cb: () => void) {
  window.addEventListener(CHANGE_EVENT, cb);
  return () => window.removeEventListener(CHANGE_EVENT, cb);
}
/** Instantané stable : la chaîne brute du cookie (« » si absent). */
function getCookieSnapshot() {
  return document.cookie.match(/(?:^|; )akn-consent=([^;]+)/)?.[1] ?? "";
}
/** Côté serveur, on ne sait pas : aucune bannière n'est rendue avant l'hydratation. */
function getServerSnapshot() {
  return null;
}

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const raw = useSyncExternalStore(subscribe, getCookieSnapshot, getServerSnapshot);
  const consent = useMemo(() => (raw ? readConsent() : null), [raw]);
  const [forcedOpen, setForcedOpen] = useState(false);
  const [custom, setCustom] = useState(false);
  const [draftExternal, setDraftExternal] = useState<boolean | null>(null);
  const externalMedia = draftExternal ?? consent?.externalMedia ?? false;
  const visible = raw === "" || forcedOpen;

  useEffect(() => {
    const onOpen = () => {
      setForcedOpen(true);
      setCustom(true);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  const set = useCallback((value: boolean) => {
    writeConsent({ externalMedia: value, decidedAt: new Date().toISOString(), v: 1 });
    window.dispatchEvent(new Event(CHANGE_EVENT));
    setForcedOpen(false);
    setCustom(false);
    setDraftExternal(null);
  }, []);
  const setExternalMedia = (v: boolean) => setDraftExternal(v);

  return (
    <ConsentContext.Provider value={{ consent, set, open: () => { setForcedOpen(true); setCustom(true); } }}>
      {children}
      {visible && (
        <div role="dialog" aria-modal="false" aria-labelledby="consent-title" className="fixed inset-x-3 bottom-3 z-[80] mx-auto max-w-2xl rounded-3xl border border-or/40 bg-reglisse p-5 text-guimauve shadow-2xl sm:inset-x-6">
          <h2 id="consent-title" className="font-display text-lg text-white">Vos choix sur ce site</h2>
          <p className="mt-2 text-sm leading-relaxed">
            Nous utilisons uniquement les cookies nécessaires au fonctionnement du site (panier, connexion). Avec votre accord, nous pouvons aussi afficher la carte OpenStreetMap de la boutique, qui transmet votre adresse IP à ce service.{" "}
            <Link href="/cookies" className="underline underline-offset-2 hover:text-white">En savoir plus</Link>
          </p>
          {custom && (
            <fieldset className="mt-4 space-y-3 rounded-2xl bg-white/5 p-4 text-sm">
              <legend className="sr-only">Catégories</legend>
              <div className="flex items-start gap-3">
                <input type="checkbox" checked disabled id="c-ess" className="mt-1 accent-laque" />
                <label htmlFor="c-ess"><strong className="text-white">Nécessaires</strong> — toujours actifs : session de connexion, panier, mémorisation de ce choix.</label>
              </div>
              <div className="flex items-start gap-3">
                <input type="checkbox" id="c-ext" checked={externalMedia} onChange={(e) => setExternalMedia(e.target.checked)} className="mt-1 accent-laque" />
                <label htmlFor="c-ext"><strong className="text-white">Contenus externes</strong> — carte interactive OpenStreetMap sur les pages Contact et Accueil.</label>
              </div>
            </fieldset>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" variant="gold" onClick={() => set(true)}>Tout accepter</Button>
            <Button size="sm" className="bg-white/10 text-white hover:bg-white/20" onClick={() => set(false)}>Tout refuser</Button>
            {custom ? (
              <Button size="sm" variant="ghost" className="text-guimauve hover:bg-white/10" onClick={() => set(externalMedia)}>Enregistrer mes choix</Button>
            ) : (
              <Button size="sm" variant="ghost" className="text-guimauve hover:bg-white/10" onClick={() => setCustom(true)}>Personnaliser</Button>
            )}
          </div>
        </div>
      )}
    </ConsentContext.Provider>
  );
}

export function ConsentLink({ className }: { className?: string }) {
  return (
    <button type="button" onClick={openConsentPanel} className={className}>
      Gérer mes cookies
    </button>
  );
}
