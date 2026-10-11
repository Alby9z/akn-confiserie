# Installation locale sous Windows (sans Docker)

Ce guide installe le site sur un PC Windows 10 ou 11 pour le développement et les tests. Comptez environ 30 minutes.

## 1. Installer les logiciels

1. **Node.js 22 LTS** — <https://nodejs.org> → « LTS » → installeur Windows (`.msi`). Laissez les options par défaut.
   Vérifiez dans **PowerShell** :
   ```powershell
   node -v    # doit afficher v22.x (minimum v20.9)
   npm -v
   ```
2. **PostgreSQL 16 ou 17** — <https://www.postgresql.org/download/windows/> → installeur EDB.
   - Notez le **mot de passe du super-utilisateur `postgres`** demandé pendant l'installation.
   - Port : `5432` (par défaut). Stack Builder n'est pas nécessaire.
   - Ajoutez les outils au PATH pour utiliser `psql` et les sauvegardes : *Paramètres → Système → Informations système → Paramètres avancés → Variables d'environnement → Path → Nouveau* : `C:\Program Files\PostgreSQL\16\bin` (adaptez le numéro de version). Rouvrez PowerShell.
3. **Git** — <https://git-scm.com/download/win> (facultatif mais recommandé).

## 2. Créer les bases de données

Ouvrez PowerShell et connectez-vous à PostgreSQL :

```powershell
psql -U postgres
```

Puis, dans `psql` (choisissez votre propre mot de passe à la place de `MOT_DE_PASSE`) :

```sql
CREATE ROLE akn WITH LOGIN PASSWORD 'MOT_DE_PASSE' CREATEDB;
CREATE DATABASE akn_confiserie OWNER akn;
CREATE DATABASE akn_confiserie_test OWNER akn;
\q
```

`akn_confiserie_test` sert uniquement aux tests automatisés (elle est vidée à chaque lancement des tests).

## 3. Configurer le projet

Dans le dossier du projet :

```powershell
npm install
copy .env.example .env
```

Ouvrez `.env` dans un éditeur (Bloc-notes, VS Code) et renseignez au minimum :

```ini
DATABASE_URL="postgresql://akn:MOT_DE_PASSE@localhost:5432/akn_confiserie"
APP_URL="http://localhost:3000"
BETTER_AUTH_SECRET="…"
```

Pour générer `BETTER_AUTH_SECRET` :

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Les autres variables (Stripe, Resend) sont facultatives en local :
- **sans clés Stripe**, la commande en ligne affiche « pas encore ouverte » ;
- **sans clé Resend**, les e-mails ne sont *pas envoyés* : leur contenu (dont les liens de confirmation) s'affiche dans le terminal où tourne `npm run dev`, et le journal de l'administration les marque « Non envoyé ».

## 4. Créer les tables et les données initiales

```powershell
npx prisma migrate deploy
npm run db:seed
```

Le seed ajoute uniquement des informations confirmées : nom de la boutique, contact, adresse, téléphone, les catégories proposées (**masquées** tant que vous ne les activez pas) et les trames des pages légales. Il ne crée aucun produit.

## 5. Lancer le site

```powershell
npm run dev
```

Ouvrez <http://localhost:3000>.

## 6. Créer le compte administrateur

1. Allez sur <http://localhost:3000/inscription> et créez votre compte.
2. Le lien de confirmation s'affiche dans le terminal (ligne `[e-mail NON envoyé …]`) : copiez-le dans le navigateur. Avec une clé Resend, vous le recevez par e-mail.
3. Dans un second PowerShell, à la racine du projet :
   ```powershell
   npm run admin:promote -- votre@adresse.fr
   ```
4. Reconnectez-vous puis ouvrez <http://localhost:3000/admin>.

Aucun compte ni mot de passe administrateur n'existe par défaut dans le code.

## 7. Tester le paiement en local (Stripe, mode test)

1. Créez un compte sur <https://dashboard.stripe.com>, restez en **mode test**, et copiez la clé secrète `sk_test_…` dans `STRIPE_SECRET_KEY`.
2. Installez la **Stripe CLI** pour Windows : <https://docs.stripe.com/stripe-cli> (fichier `.zip` à extraire, ou `scoop install stripe`).
3. Dans un PowerShell séparé :
   ```powershell
   stripe login
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
   Copiez le secret affiché (`whsec_…`) dans `STRIPE_WEBHOOK_SECRET`, puis redémarrez `npm run dev`.
4. Dans l'administration → *Contenus et paramètres*, cochez **Retrait en boutique**, créez un produit avec du stock, puis passez une commande avec la carte de test `4242 4242 4242 4242`, une date future et n'importe quel code.
5. La page de confirmation passe à « Merci » dès que le webhook est reçu ; la commande apparaît dans *Mon compte* et dans l'administration.

Autres cartes de test utiles : `4000 0000 0000 9995` (refus — fonds insuffisants), `4000 0025 0000 3155` (authentification 3D Secure).

## 8. Lancer les tests et vérifications

```powershell
$env:TEST_DATABASE_URL="postgresql://akn:MOT_DE_PASSE@localhost:5432/akn_confiserie_test"
npx prisma migrate deploy   # avec DATABASE_URL pointant temporairement vers la base de test, voir ci-dessous
npm run check
```

Pour préparer la base de test une première fois :

```powershell
$env:DATABASE_URL="postgresql://akn:MOT_DE_PASSE@localhost:5432/akn_confiserie_test"
npx prisma migrate deploy
Remove-Item Env:DATABASE_URL
```

`npm run check` exécute : vérification TypeScript, ESLint, tests unitaires et d'intégration, build de production.

## Problèmes fréquents

| Symptôme | Solution |
|---|---|
| `psql` n'est pas reconnu | Ajoutez le dossier `bin` de PostgreSQL au PATH (étape 1) et rouvrez PowerShell. |
| `password authentication failed for user "akn"` | Le mot de passe de `DATABASE_URL` ne correspond pas à celui de l'étape 2. |
| `Configuration invalide (.env)` au démarrage | Le message liste les variables manquantes ; complétez `.env`. En production, Stripe et Resend sont obligatoires. |
| Le port 3000 est déjà utilisé | `npm run dev -- -p 3001` (et mettez `APP_URL` à jour). |
| Exécution de scripts désactivée (PowerShell) | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| Le paiement reste « en cours de confirmation » | `stripe listen` ne tourne pas, ou `STRIPE_WEBHOOK_SECRET` ne correspond pas au secret affiché. |
