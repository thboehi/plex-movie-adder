# 🎯 Nouvelle Architecture SIMPLE - Documentation

## ✨ Principe : UNE collection, UNE source de vérité

### Pourquoi ce changement ?
- ❌ **Avant** : 3 collections (users, subscriptions, brunch) = synchronisation complexe
- ✅ **Maintenant** : 1 collection (users) = simplicité maximale

## 📊 Structure de la collection `users`

```javascript
{
  _id: ObjectId,
  
  // Informations personnelles
  name: String,               // Prénom
  surname: String,            // Nom de famille
  email: String,              // Email (unique)
  
  // Authentification (pour le futur)
  password: String,           // Hash du mot de passe (optionnel)
  role: "user" | "admin",     // Rôle de l'utilisateur
  
  // ABONNEMENT - Structure simple
  subscription: {
    expiresAt: Date,                    // ⭐ SOURCE DE VÉRITÉ UNIQUE
    isActive: Boolean,                  // Calculé (expiresAt > maintenant)
    currentType: "quarterly"|"annual",  // Type actuel
    lastPaymentDate: Date,              // Date du dernier paiement
    lastPaymentAmount: Number,          // Montant du dernier paiement
    
    // Historique complet des paiements
    history: [
      {
        date: Date,           // Date du paiement
        amount: Number,       // Montant payé
        type: String,         // "quarterly" ou "annual"
        months: Number,       // 3 ou 12
        expiresAt: Date       // Date d'expiration après ce paiement
      }
    ]
  },
  
  // Metadata
  createdAt: Date,
  updatedAt: Date
}
```

## 🎯 Avantages de cette architecture

### 1. Simplicité
- ✅ **UNE** collection au lieu de 3
- ✅ **UNE** date d'expiration (`subscription.expiresAt`)
- ✅ Pas de synchronisation entre collections
- ✅ Tout au même endroit

### 2. Fiabilité
- ✅ Source de vérité unique = pas de conflits
- ✅ Dates exactes depuis users.json
- ✅ Moins de bugs possibles
- ✅ Facile à comprendre

### 3. Performance
- ✅ Une seule requête pour tout récupérer
- ✅ Index efficaces
- ✅ Pas de jointures nécessaires

### 4. Évolutivité
- ✅ Facile d'ajouter des champs (password, etc.)
- ✅ Historique complet dans `subscription.history`
- ✅ Prêt pour l'authentification

## 🔧 Routes API simplifiées

### POST `/api/brunch/add` - Ajouter un paiement

**Requête**
```json
{
  "userId": "67d9928776cda976ae6570cb",
  "amount": 29.90,
  "months": "3"
}
```

**Traitement**
1. Validation : seulement 3 ou 12 mois
2. Calcul de la nouvelle `expiresAt`
3. Mise à jour de `subscription` dans users
4. Ajout dans `subscription.history`

**Réponse**
```json
{
  "success": true,
  "expiresAt": "2026-03-12T00:00:00.000Z",
  "type": "quarterly",
  "isActive": true
}
```

### GET `/api/users` - Liste des utilisateurs

**Réponse**
```json
[
  {
    "_id": "67d9928776cda976ae6570cb",
    "name": "Aude",
    "surname": "Valiton",
    "email": "eggeraude@sunrise.ch",
    "role": "user",
    "subscription": {
      "expiresAt": "2026-07-12T00:00:00.000Z",
      "isActive": true,
      "currentType": "annual",
      "lastPaymentDate": "2026-07-12T00:00:00.000Z",
      "lastPaymentAmount": 0,
      "history": []
    },
    "subscriptionEnd": "2026-07-12T00:00:00.000Z"  // Pour rétrocompatibilité
  }
]
```

### POST `/api/users` - Créer un utilisateur

**Requête**
```json
{
  "name": "Julie",
  "surname": "Bernard",
  "email": "julie@example.com"
}
```

**Traitement**
- Crée l'utilisateur avec structure `subscription` vide
- Initialise le rôle à "user"
- Définit `subscription.isActive` à false

## 💰 Formules d'abonnement

| Formule | Durée | Prix | Type |
|---------|-------|------|------|
| **Trimestrielle** | 3 mois | 29.90 CHF | `quarterly` |
| **Annuelle** | 12 mois | 100 CHF | `annual` |

## 🔄 Flux d'ajout de paiement

```
1. Requête POST /api/brunch/add
   ↓
2. Validation formule (3 ou 12 mois)
   ↓
3. Récupération utilisateur
   ↓
4. Calcul nouvelle expiresAt
   │
   ├─ Si abonnement actif (expiresAt > now)
   │  → Prolonge depuis expiresAt actuel
   │
   └─ Sinon
      → Nouvelle date depuis aujourd'hui
   ↓
5. Mise à jour users
   ├─ subscription.expiresAt = nouvelle date
   ├─ subscription.isActive = true
   ├─ subscription.currentType = type
   ├─ subscription.lastPaymentDate = now
   ├─ subscription.lastPaymentAmount = amount
   └─ subscription.history.push({ date, amount, type, months, expiresAt })
   ↓
6. Réponse succès
```

## 🛠️ Commandes utiles

### Reconstruire la collection users
```bash
pnpm run rebuild:users
```

Ce script :
1. ✅ Lit `users.json` comme source de vérité
2. ✅ Récupère l'historique de brunch (si existe)
3. ✅ Crée la nouvelle structure pour chaque user
4. ✅ Insère dans MongoDB
5. ✅ Crée les index

### Vérifier la structure
```bash
node -e "
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env' });

(async () => {
  const client = await MongoClient.connect(process.env.MONGODB_URI);
  const db = client.db();
  const users = await db.collection('users').find({}).toArray();
  console.log(JSON.stringify(users[0], null, 2));
  await client.close();
})();
"
```

## 📋 Index MongoDB

```javascript
// Email unique
db.users.createIndex({ email: 1 }, { unique: true })

// Tri par date d'expiration
db.users.createIndex({ "subscription.expiresAt": -1 })

// Filtrer par statut actif
db.users.createIndex({ "subscription.isActive": 1 })
```

## 🎨 Interface - Rétrocompatibilité

L'interface actuelle attend `subscriptionEnd` à la racine.  
La route `/api/users` ajoute automatiquement ce champ :

```javascript
subscriptionEnd: user.subscription?.expiresAt || null
```

Cela permet de garder l'interface actuelle sans modification.

## 🔮 Futures améliorations possibles

### 1. Authentification
```javascript
subscription: {
  password: bcrypt.hash(password),  // Hash du mot de passe
  role: "admin" | "user",           // Déjà en place
  lastLogin: Date                   // Date dernière connexion
}
```

### 2. Notifications
```javascript
subscription: {
  notifications: {
    expirationWarning: Boolean,     // Alerter avant expiration
    emailSent: Date                 // Dernière alerte envoyée
  }
}
```

### 3. Statistiques
```javascript
subscription: {
  stats: {
    totalSpent: Number,             // Total dépensé
    totalMonths: Number,            // Total de mois d'abonnement
    joinedAt: Date,                 // Date premier abonnement
    renewalCount: Number            // Nombre de renouvellements
  }
}
```

## ✅ Résumé

### Ce qui a changé
- ❌ Plus de collection `subscriptions`
- ❌ Plus de complexité inutile
- ✅ Tout dans `users`
- ✅ Une seule source de vérité : `subscription.expiresAt`

### Avantages immédiats
1. **Simplicité** : Facile à comprendre et maintenir
2. **Fiabilité** : Dates exactes, pas de bugs de synchronisation
3. **Performance** : Une seule requête
4. **Évolutivité** : Prêt pour login/auth

### Migration
- ✅ Script `rebuild-users.js` crée la nouvelle structure
- ✅ Utilise `users.json` comme référence
- ✅ Conserve l'historique de `brunch`
- ✅ Rétrocompatible avec l'interface actuelle

---

**Plus simple. Plus fiable. Plus maintenable.** 🎯
