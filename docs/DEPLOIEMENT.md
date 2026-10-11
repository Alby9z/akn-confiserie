# Déploiement et sauvegardes

## Quel hébergement choisir

Le site a besoin de trois choses : **Node.js 20.9+**, **PostgreSQL** et un **disque persistant** pour les photos produits et les pièces jointes (dossier `STORAGE_DIR`).

| Option | Adaptée ? | Remarques |
|---|---|---|
| **Serveur privé (VPS) en France** — OVHcloud, Scaleway, Hetzner… avec Ubuntu 24.04 | Recommandée | Coût faible, contrôle total, données en France. Procédure ci-dessous. |
| **Plateforme gérée avec disque** — Render, Railway, Clever Cloud (France) | Oui | Ajouter un disque/volume monté sur `STORAGE_DIR` et une base PostgreSQL gérée avec sauvegardes. |
| **Vercel / Netlify (serverless)** | Non, en l'état | Pas de disque persistant : les photos déposées seraient perdues. Il faudrait d'abord adapter `src/lib/storage.ts` à un stockage objet (S3, R2…). |

Aucune de ces options n'utilise Docker.

## Procédure sur un VPS Ubuntu 24.04

### 1. Préparer le serveur

```bash
sudo apt update && sudo apt upgrade -y
# Node.js 22 (dépôt officiel NodeSource)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs postgresql caddy git
sudo adduser --system --group --home /srv/akn akn
```

### 2. Base de données

```bash
sudo -u postgres psql -c "CREATE ROLE akn WITH LOGIN PASSWORD 'MOT_DE_PASSE_LONG_ET_ALEATOIRE';"
sudo -u postgres createdb -O akn akn_confiserie
```

PostgreSQL n'écoute que sur `localhost` par défaut : laissez-le ainsi.

### 3. Code et configuration

```bash
sudo -u akn git clone <url-du-depot> /srv/akn/app
cd /srv/akn/app
sudo -u akn cp .env.example .env
sudo -u akn nano .env          # valeurs de production, voir ci-dessous
sudo chmod 600 .env
sudo -u akn npm ci
sudo -u akn npx prisma migrate deploy
sudo -u akn npm run db:seed
sudo -u akn npm run build
```

Valeurs de production dans `.env` :
- `APP_URL="https://www.votre-domaine.fr"`
- `BETTER_AUTH_SECRET` : **nouveau** secret (jamais celui de développement)
- `STRIPE_SECRET_KEY` : clé **live** `sk_live_…` (seulement au moment de l'ouverture ; testez d'abord en `sk_test_`)
- `STRIPE_WEBHOOK_SECRET` : secret du webhook créé à l'étape 6
- `RESEND_API_KEY`, `EMAIL_FROM` avec un domaine vérifié chez Resend, `ADMIN_NOTIFICATION_EMAIL`
- `STORAGE_DIR="/srv/akn/storage"`

Le serveur refuse de démarrer si l'une des variables obligatoires manque : c'est voulu.

### 4. Service systemd

`/etc/systemd/system/akn.service` :

```ini
[Unit]
Description=AKN Confiserie 90
After=network.target postgresql.service

[Service]
User=akn
WorkingDirectory=/srv/akn/app
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5
NoNewPrivileges=true
ProtectSystem=full

[Install]
WantedBy=multi-user.target
```

```bash
sudo mkdir -p /srv/akn/storage && sudo chown akn:akn /srv/akn/storage
sudo systemctl daemon-reload && sudo systemctl enable --now akn
sudo journalctl -u akn -f      # journaux en direct
```

### 5. HTTPS avec Caddy

`/etc/caddy/Caddyfile` :

```
www.votre-domaine.fr {
    reverse_proxy localhost:3000
    request_body {
        max_size 10MB
    }
}
votre-domaine.fr {
    redir https://www.votre-domaine.fr{uri} permanent
}
```

```bash
sudo systemctl reload caddy
```

Caddy obtient et renouvelle automatiquement le certificat HTTPS. Pointez les enregistrements DNS `A`/`AAAA` du domaine vers l'IP du serveur avant de recharger. Ouvrez uniquement les ports 22, 80 et 443 (`sudo ufw allow OpenSSH && sudo ufw allow 80,443/tcp && sudo ufw enable`).

### 6. Webhook Stripe

Tableau de bord Stripe → *Développeurs → Webhooks → Ajouter un point de terminaison* :
- URL : `https://www.votre-domaine.fr/api/stripe/webhook`
- Événements : `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`

Copiez le « secret de signature » dans `STRIPE_WEBHOOK_SECRET`, puis `sudo systemctl restart akn`. Refaites l'opération en mode live au moment de l'ouverture (secret différent).

### 7. Tâches planifiées

`sudo crontab -u akn -e` :

```cron
# Libère le stock des paiements abandonnés
*/15 * * * * cd /srv/akn/app && npm run -s orders:expire >> /srv/akn/expire.log 2>&1
# Sauvegarde quotidienne à 3 h 15
15 3 * * * cd /srv/akn/app && set -a && . ./.env && set +a && BACKUP_DIR=/srv/akn/backups STORAGE_DIR=/srv/akn/storage ALERT_EMAIL=vous@domaine.fr ./scripts/backup.sh >> /srv/akn/backup.log 2>&1
```

### 8. Mettre à jour le site

```bash
cd /srv/akn/app
sudo -u akn git pull
sudo -u akn npm ci
sudo -u akn npx prisma migrate deploy
sudo -u akn npm run build
sudo systemctl restart akn
```

Pour automatiser, un workflow GitHub Actions peut se connecter en SSH et exécuter ces commandes après le succès de `.github/workflows/ci.yml` (qui vérifie déjà typecheck, lint, tests et build à chaque push).

## Sauvegardes

**Une sauvegarde n'est fiable qu'une fois sa restauration testée.**

- `scripts/backup.sh` (serveur) / `scripts/backup.ps1` (Windows) : export complet de la base au format `pg_dump`, vérification de l'archive, copie du dossier de fichiers, suppression au-delà de `RETENTION_DAYS` (30 jours par défaut), alerte e-mail en cas d'échec (`ALERT_EMAIL`).
- Copiez régulièrement les sauvegardes **hors du serveur** (stockage objet, autre machine) : une sauvegarde sur le même disque ne protège pas d'une panne de celui-ci.
- Si la base est gérée (Render, Scaleway…), activez aussi les sauvegardes automatiques du fournisseur.

### Tester une restauration (à faire avant l'ouverture, puis chaque trimestre)

```bash
createdb -O akn akn_restauration_test
pg_restore --no-owner --dbname=postgresql://akn:MOT_DE_PASSE@localhost:5432/akn_restauration_test /srv/akn/backups/akn-AAAAMMJJ-HHMMSS.dump
psql postgresql://akn:MOT_DE_PASSE@localhost:5432/akn_restauration_test -c 'SELECT count(*) FROM "Order";'
dropdb akn_restauration_test
```

Comparez le nombre de commandes avec celui de l'administration. Notez la date du test dans la checklist.

## Surveillance

- Journaux applicatifs : `journalctl -u akn`. Les erreurs de paiement et de webhook sont préfixées `[stripe]`, celles des e-mails `[e-mail]`.
- Stripe : l'onglet *Webhooks* affiche les livraisons en échec (Stripe les renvoie automatiquement pendant 3 jours).
- Administration → *Journal* : actions sensibles et e-mails non envoyés.
- Recommandé : une sonde de disponibilité gratuite (UptimeRobot, Better Stack…) sur la page d'accueil.

## Google Search Console

1. <https://search.google.com/search-console> → ajouter la propriété `https://www.votre-domaine.fr`.
2. Méthode « balise HTML » : copiez la valeur `content="…"` dans `GOOGLE_SITE_VERIFICATION`, redémarrez, validez.
3. Soumettez le sitemap : `https://www.votre-domaine.fr/sitemap.xml`.

Créez aussi la fiche **Google Business Profile** de la boutique avec exactement la même adresse et le même téléphone que sur le site.
