import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getSession, requireUser } from "@/lib/session";
import { PasswordForm, RevokeSessionButton } from "@/components/account/forms";
import { Badge } from "@/components/ui/feedback";

export const metadata = { title: "Sécurité et appareils" };

function describeAgent(ua: string | null | undefined) {
  if (!ua) return "Appareil inconnu";
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Navigateur";
  const os = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Mac OS/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "";
  return `${browser}${os ? ` sur ${os}` : ""}`;
}

export default async function SecurityPage() {
  await requireUser("/compte/securite");
  const current = await getSession();
  const sessions = await auth.api.listSessions({ headers: await headers() });
  return (
    <div className="max-w-2xl space-y-10">
      <section>
        <h1 className="font-display text-3xl text-reglisse">Sécurité et appareils</h1>
        <h2 className="mt-6 font-display text-xl text-reglisse">Appareils connectés</h2>
        <ul className="mt-3 space-y-2">
          {sessions.map((s) => {
            const isCurrent = s.token === current?.session.token;
            return (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 text-sm">
                <span>
                  <strong>{describeAgent(s.userAgent)}</strong>
                  <span className="block text-encre-doux">Dernière activité : {new Date(s.updatedAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</span>
                </span>
                {isCurrent ? <Badge tone="success">Cet appareil</Badge> : <RevokeSessionButton token={s.token} />}
              </li>
            );
          })}
        </ul>
        {sessions.length > 1 && <div className="mt-3"><RevokeSessionButton label="Déconnecter tous les autres appareils" /></div>}
      </section>
      <section className="rounded-3xl bg-white p-6">
        <h2 className="font-display text-xl text-reglisse">Changer de mot de passe</h2>
        <div className="mt-4"><PasswordForm /></div>
      </section>
    </div>
  );
}
