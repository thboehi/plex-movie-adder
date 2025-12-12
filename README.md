# 🎬 Plex Movie Adder

Système de gestion d'abonnements pour le serveur Plex avec interface d'administration.

## 🚀 Quick Start

```bash
# Installation
npm install

# Configuration
cp .env.example .env.local
# Éditer .env.local avec vos valeurs

# Migration des données (première fois)
npm run migrate:subscriptions

# Lancer l'application
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

## 📚 Documentation

- **[QUICKSTART.md](./QUICKSTART.md)** - Démarrage rapide
- **[MIGRATION.md](./MIGRATION.md)** - Guide de migration des données
- **[SUBSCRIPTIONS.md](./SUBSCRIPTIONS.md)** - Architecture complète
- **[SUMMARY.md](./SUMMARY.md)** - Résumé des modifications

## 💰 Formules d'abonnement

| Formule | Durée | Prix | Prix/mois |
|---------|-------|------|-----------|
| **Trimestrielle** | 3 mois | 29.90 CHF | 9.97 CHF |
| **Annuelle** | 12 mois | 100 CHF | 8.33 CHF |

## 🛠️ Commandes utiles

### Développement
```bash
npm run dev          # Serveur de développement
npm run build        # Build production
npm run start        # Serveur production
npm run lint         # Linter
```

### Gestion des abonnements
```bash
npm run subs:stats   # Statistiques
npm run subs:list    # Liste des abonnements
npm run subs:active  # Abonnements actifs
npm run subs:update  # Mise à jour des statuts
```

## 🏗️ Architecture

### Collections MongoDB

**users** - Informations utilisateurs
- name, surname, email
- currentSubscriptionEnd (date d'expiration)

**subscriptions** - Historique des abonnements
- userId, type, amount
- startDate, endDate, status
- Traçabilité complète

**brunch** - Legacy (conservé pour l'audit)

### Routes API

- `GET /api/users` - Liste des utilisateurs
- `POST /api/users` - Créer un utilisateur
- `GET /api/subscriptions` - Récupérer les abonnements
- `PATCH /api/subscriptions` - Mettre à jour les statuts
- `POST /api/brunch/add` - Ajouter un paiement

## 🔐 Authentification

- **Admin** : Accès complet, gestion des paiements
- **Utilisateur** : Vue limitée de ses abonnements

## 🎨 Stack technique

- **Framework** : [Next.js](https://nextjs.org) 15.2
- **UI** : React 19 + [Material Tailwind](https://www.material-tailwind.com/)
- **Styling** : [Tailwind CSS](https://tailwindcss.com)
- **Database** : MongoDB
- **Auth** : JWT (jose)

## 📝 Notes

- Migration non-destructive des anciennes données
- Système de filtrage et tri automatique
- Badges de statut (actif, expire bientôt, expiré)
- Interface responsive dark/light mode

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).
