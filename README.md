# AKN Confiserie 90 — boutique en ligne

Site e-commerce de **AKN Confiserie 90**, boutique de bonbons et confiseries au 23 boulevard Joffre, 90000 Belfort (contact : Justine Dolle, 07 66 39 47 84).

> **État du projet : version de développement complète, pas encore en production.**
> Le code, les tests automatisés et le build passent. Avant l'ouverture, il reste à brancher les vrais comptes (Stripe, Resend, hébergement), à saisir le catalogue réel et à faire valider les textes juridiques : voir [la checklist](docs/CHECKLIST-PRODUCTION.md).

## Ce que fait le site

**Côté clients**
- Accueil, boutique avec recherche, filtres (catégorie, prix) et tris, pages catégories, fiches produits (photos, prix au kilo, informations alimentaires, produits complémentaires), promotions, coffrets (si la catégorie est activée).
- Panier conservé dans le navigateur, synchronisé avec le compte une fois connecté ; stocks et prix toujours recalculés par le serveur ; codes promo.
- Commande en retrait boutique et/ou livraison (selon ce qui est activé), paiement **Stripe Checkout**, confirmation par e-mail. Commande possible sans compte.
- Demandes **événementielles et sur mesure** (anniversaires, mariages, grosses commandes, sachets personnalisés…) avec pièce jointe, anti-spam, accusé de réception et référence.
- Espace client : commandes et suivi, récapitulatif imprimable, adresses, favoris, demandes et réponses de la boutique, préférences e-mail, appareils connectés, changement de mot de passe, demande de suppression du compte.
- Pages légales (trames à compléter), gestion des cookies (Accepter / Refuser / Personnaliser), FAQ, contact, itinéraire, carte OpenStreetMap chargée seulement avec accord.

**Côté boutique (`/admin`)**
- Tableau de bord : chiffre d'affaires encaissé (paiements Stripe confirmés, remboursements déduits), commandes à préparer, ruptures, meilleures ventes, demandes en attente, et liste de ce qui manque avant l'ouverture.
- Produits (prix, ancien prix pour les vraies promos, conditionnement, poids, photos, informations alimentaires, SEO), stocks avec historique des mouvements, catégories (ordre, visibilité), codes promo.
- Commandes : filtres, détail, changements de statut contrôlés (avec e-mail au client), remboursements Stripe, export CSV.
- Demandes : suivi par statut, notes internes, réponse et devis envoyés par e-mail (jamais d'acceptation automatique).
- Clients : fiche, historique, traitement des demandes de suppression.
- Contenus : coordonnées, horaires, textes d'accueil, bandeau d'annonce, retrait/livraison, FAQ, pages légales.
- Journal des actions sensibles et des e-mails envoyés.

## Pile technique

| Rôle | Choix |
|---|---|
| Application | Next.js 16 (App Router, Server Components, Server Actions, Route Handlers), React 19, TypeScript strict |
| Interface | Tailwind CSS 4, composants maison dans l'esprit shadcn/ui, Lucide, polices locales (Fraunces, Plus Jakarta Sans) |
| Formulaires | React Hook Form + Zod (validation partagée navigateur/serveur, toujours revalidée côté serveur) |
| Données | PostgreSQL + Prisma 7 (adaptateur `pg`), migrations versionnées, contraintes `CHECK` en base |
| Authentification | Better Auth (e-mail + mot de passe, vérification d'e-mail, réinitialisation, sessions expirables, limitation des tentatives) |
| Paiement | Stripe Checkout + webhooks signés et idempotents |
| E-mails | Resend |
| Tests | Vitest (tests unitaires + intégration sur une vraie base PostgreSQL) |

Pas de Docker, pas de second backend, pas de Redis : la limitation de débit est stockée dans PostgreSQL, suffisant pour ce volume.

Choix assumés :
- **Rendu dynamique** (`cacheComponents: false`) : catalogue, prix et stocks sont toujours lus à jour en base.
- **Prisma 7.10** (et non la 8, encore en version candidate au moment du développement).
- **Pas de Framer Motion** : le cahier des charges le prévoyait pour des animations légères, mais la seule animation retenue (pastille du panier) tient en quelques lignes de CSS ; la dépendance n'a donc pas été ajoutée. Elle peut l'être si de nouvelles animations sont souhaitées.

## Démarrage rapide (développement)

Guide détaillé pas à pas : **[docs/INSTALLATION-WINDOWS.md](docs/INSTALLATION-WINDOWS.md)**.

```powershell
npm install
copy .env.example .env      # puis remplir DATABASE_URL et BETTER_AUTH_SECRET
npx prisma migrate deploy   # crée les tables
npm run db:seed             # coordonnées confirmées, catégories proposées (masquées), trames légales
npm run dev                 # http://localhost:3000
```

Créer le premier compte administrateur : s'inscrire sur `/inscription`, cliquer le lien de confirmation (en local sans Resend, il s'affiche dans le terminal), puis :

```powershell
npm run admin:promote -- votre@adresse.fr
```

## Commandes utiles

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` / `npm start` | Build et serveur de production |
| `npm run typecheck` / `npm run lint` | Vérifications TypeScript et ESLint |
| `npm test` | Tests (nécessite la base de test, voir le guide) |
| `npm run check` | Tout : typecheck, lint, tests, build |
| `npm run db:migrate` | Créer une nouvelle migration après modification du schéma |
| `npm run db:deploy` | Appliquer les migrations (production) |
| `npm run db:seed` | Données initiales (ré-exécutable sans écraser) |
| `npm run admin:promote -- email` | Donner le rôle administrateur (`--retirer` pour l'enlever) |
| `npm run orders:expire` | Libérer le stock des paiements abandonnés (à planifier toutes les 15 min) |

## Organisation du code

```
prisma/
  schema.prisma          modèle de données (montants en centimes, jamais en flottant)
  migrations/            migrations versionnées (dont contraintes d'intégrité CHECK)
  seed.ts, legal/        données initiales et trames juridiques
src/
  app/(shop)/            site public, panier, commande, espace client (/compte)
  app/admin/             administration (+ _actions/ : Server Actions protégées)
  app/api/               auth, panier, paiement, webhook Stripe
  components/            ui/, layout/, shop/, account/, admin/
  lib/                   services métier : orders, payments, pricing, auth, session,
                         storage, email/, validation/, rate-limit, audit…
tests/unit, tests/integration
scripts/                 promotion admin, expiration des commandes, sauvegardes
docs/                    installation Windows, déploiement, checklist de production
```

## Sécurité — points clés

- Prix, remises, frais de port et stocks **recalculés côté serveur** ; le navigateur n'envoie que des identifiants et des quantités.
- Stock réservé à la création de la commande par décrément conditionnel en transaction (impossible de vendre deux fois la dernière unité — testé en concurrence), libéré si le paiement n'aboutit pas.
- Une commande n'est **payée que sur webhook Stripe signé**, montant vérifié ; événements dédupliqués (table `StripeEvent`).
- Rôle administrateur vérifié **sur chaque page et chaque action** côté serveur, pas seulement dans le menu.
- Mots de passe hachés par Better Auth (scrypt), cookies `HttpOnly`/`SameSite=Lax`/`Secure` en production, protection CSRF (origine vérifiée), limitation des tentatives de connexion et des formulaires.
- Fichiers déposés : type détecté par signature binaire, 5 Mo maximum, stockés hors du dossier public, pièces jointes téléchargeables uniquement par l'administration.
- En-têtes de sécurité (CSP, HSTS en production, X-Frame-Options…), export CSV protégé contre l'injection de formules.
- En production, le serveur **refuse de démarrer** si Stripe ou les e-mails ne sont pas configurés, plutôt que de simuler leur fonctionnement.

## Ce qui reste à fournir par la cliente

Aucune information commerciale n'a été inventée. À compléter dans l'administration ou à transmettre :
- produits réels (photos, prix, conditionnements, stocks, composition et allergènes du fournisseur) ;
- catégories à garder (les catégories proposées sont créées **masquées**) ;
- horaires d'ouverture, adresse e-mail professionnelle, réseaux sociaux ;
- modes de remise proposés (retrait, livraison, tarifs) et délai de réponse aux demandes ;
- informations légales (SIRET, forme juridique, TVA, médiateur, hébergeur) et validation des pages légales ;
- textes d'accueil et de présentation ;
- coordonnées GPS de la boutique pour afficher la carte (sinon seul le bouton « Itinéraire » apparaît).

Il n'y a pas de section « avis clients » : le site n'affichera des avis que lorsqu'un système d'avis authentiques sera mis en place.

## Documentation

- [Installation locale sous Windows (sans Docker)](docs/INSTALLATION-WINDOWS.md)
- [Déploiement et sauvegardes](docs/DEPLOIEMENT.md)
- [Checklist avant mise en production](docs/CHECKLIST-PRODUCTION.md)
