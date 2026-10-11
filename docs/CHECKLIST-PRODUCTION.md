# Checklist avant mise en production

Cochez chaque point. Le site ne doit pas être annoncé comme ouvert tant qu'une case de la section « Bloquant » reste vide.

## Bloquant

### Informations de la boutique (à confirmer par Justine)
- [ ] Nom commercial définitif confirmé (actuellement « AKN Confiserie 90 », d'après le logo)
- [ ] Horaires d'ouverture saisis (*Admin → Contenus et paramètres*)
- [ ] Adresse e-mail professionnelle saisie
- [ ] Modes de remise décidés et activés : retrait en boutique et/ou livraison (avec tarifs et zone)
- [ ] Délai de réponse aux demandes : saisi **uniquement** s'il peut être tenu

### Catalogue
- [ ] Catégories validées : activer celles retenues, supprimer les autres
- [ ] Produits réels saisis avec prix TTC, conditionnement, stock
- [ ] Photos réelles ajoutées (aucune photo de banque d'images présentée comme un produit)
- [ ] Composition et allergènes recopiés **depuis les fiches fournisseurs**, ou laissés vides (le site affiche alors un avertissement)
- [ ] Aucun produit de démonstration ou de test restant

### Juridique
- [ ] Mentions légales complétées (SIRET, forme juridique, TVA, directrice de publication, hébergeur)
- [ ] CGV complétées : rétractation (denrées périssables), retrait/livraison, acompte et annulation des commandes sur mesure, médiateur de la consommation
- [ ] Politique de confidentialité complétée (durées de conservation, sous-traitants)
- [ ] Les quatre pages relues par un professionnel puis marquées « validée » dans l'administration
- [ ] Médiateur de la consommation désigné

### Paiement (Stripe)
- [ ] Compte Stripe activé (identité, IBAN) — encaissements possibles
- [ ] Parcours complet testé **en mode test** : commande, paiement `4242…`, confirmation, commande visible dans *Mon compte* et l'administration, e-mails reçus
- [ ] Paiement refusé testé (`4000 0000 0000 9995`) : la commande ne passe pas en « payée », le stock est libéré
- [ ] Remboursement test effectué depuis l'administration
- [ ] Webhook de production créé avec les 5 événements (voir DEPLOIEMENT.md) et secret `whsec_` live renseigné
- [ ] Clé `sk_live_` renseignée **au moment de l'ouverture seulement**
- [ ] Une vraie commande d'un petit montant passée puis remboursée en live

### E-mails (Resend)
- [ ] Domaine d'envoi vérifié (enregistrements DNS SPF/DKIM ajoutés)
- [ ] `EMAIL_FROM` utilise ce domaine ; `ADMIN_NOTIFICATION_EMAIL` est une adresse lue chaque jour
- [ ] Reçus et non classés en spam : confirmation d'inscription, mot de passe oublié, confirmation de commande, notification boutique, accusé de demande, réponse à une demande

### Serveur et sécurité
- [ ] HTTPS actif, redirection du domaine nu vers `www` (ou l'inverse)
- [ ] `.env` de production avec un **nouveau** `BETTER_AUTH_SECRET`, droits `600`, absent de Git
- [ ] `APP_URL` = adresse HTTPS définitive (les liens des e-mails en dépendent)
- [ ] Pare-feu : seuls les ports 22, 80, 443 ouverts ; PostgreSQL non exposé
- [ ] Compte administrateur créé via `npm run admin:promote`, mot de passe long et unique
- [ ] Tâche `orders:expire` planifiée (toutes les 15 minutes)
- [ ] `npm audit --omit=dev` sans vulnérabilité élevée non traitée

### Sauvegardes
- [ ] Sauvegarde quotidienne planifiée et copiée hors du serveur
- [ ] Alerte en cas d'échec configurée (`ALERT_EMAIL`)
- [ ] **Restauration testée** le : ____ / ____ / ______

## Vérifications de qualité

- [ ] `npm run check` passe (typecheck, lint, tests, build)
- [ ] Lighthouse (Chrome → F12 → Lighthouse, mode mobile) sur l'accueil, la boutique et une fiche produit : objectifs Performance 90+, Accessibilité 95+, Bonnes pratiques 95+, SEO 95+. Notez les scores réels et corrigez les points signalés : ce sont des objectifs, pas des garanties.
- [ ] Navigation complète au clavier (Tab / Entrée / Échap) : menu, panier, commande, formulaires
- [ ] Affichage vérifié sur téléphone (iPhone et Android), tablette et ordinateur
- [ ] Bannière cookies : « Tout refuser » aussi simple que « Tout accepter », la carte ne se charge qu'après accord
- [ ] Page 404 et liens du pied de page vérifiés

## Après l'ouverture

- [ ] Google Search Console configurée, sitemap soumis
- [ ] Fiche Google Business Profile avec adresse et téléphone identiques au site
- [ ] Premières commandes suivies de près (journal, tableau de bord Stripe)
- [ ] Mise à jour des dépendances planifiée (mensuelle) : `npm outdated`, puis `npm run check` avant chaque déploiement
- [ ] Test de restauration trimestriel
