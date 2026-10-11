"use client";

import { useState } from "react";
import { AddressForm, DeleteAddressButton } from "./forms";
import { Badge } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";

type Addr = { id: string; label: string | null; fullName: string; line1: string; line2: string | null; postalCode: string; city: string; phone: string | null; isDefault: boolean };

export function AddressManager({ addresses }: { addresses: Addr[] }) {
  const [editing, setEditing] = useState<string | "new" | null>(addresses.length === 0 ? "new" : null);
  return (
    <div className="space-y-4">
      {addresses.map((a) => (
        <div key={a.id} className="rounded-3xl bg-white p-5">
          {editing === a.id ? (
            <AddressForm address={a} onDone={() => setEditing(null)} />
          ) : (
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="text-sm leading-relaxed">
                {a.label && <strong className="block">{a.label}</strong>}
                {a.fullName}<br />{a.line1}{a.line2 ? <><br />{a.line2}</> : null}<br />{a.postalCode} {a.city}
              </p>
              <div className="flex items-center gap-2">
                {a.isDefault && <Badge tone="or">Par défaut</Badge>}
                <Button variant="ghost" size="sm" onClick={() => setEditing(a.id)}>Modifier</Button>
                <DeleteAddressButton id={a.id} />
              </div>
            </div>
          )}
        </div>
      ))}
      {editing === "new" ? (
        <div className="rounded-3xl bg-white p-5"><AddressForm onDone={() => setEditing(null)} /></div>
      ) : (
        addresses.length < 10 && <Button variant="secondary" onClick={() => setEditing("new")}>Ajouter une adresse</Button>
      )}
    </div>
  );
}
