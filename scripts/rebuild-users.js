#!/usr/bin/env node
/**
 * Script de reconstruction de la collection users avec nouvelle architecture simple
 * 
 * Structure finale :
 * {
 *   _id, name, surname, email,
 *   password (optionnel, pour login futur),
 *   role: "user" | "admin",
 *   subscription: {
 *     expiresAt: Date,              // UNIQUE source de vérité
 *     isActive: Boolean,
 *     currentType: "quarterly"|"annual",
 *     lastPaymentDate: Date,
 *     lastPaymentAmount: Number,
 *     history: [{ date, amount, type, months, expiresAt }]
 *   },
 *   createdAt, updatedAt
 * }
 */

const { MongoClient, ObjectId } = require("mongodb");
const fs = require("fs");
const path = require("path");
require('dotenv').config({ path: '.env' });

if (!process.env.MONGODB_URI) {
  console.error("❌ MONGODB_URI n'est pas défini dans .env");
  process.exit(1);
}

const uri = process.env.MONGODB_URI;

// Charger le fichier users.json comme source de vérité
const usersJsonPath = path.join(__dirname, '..', 'users.json');
let usersFromFile = [];

if (fs.existsSync(usersJsonPath)) {
  console.log("📄 Chargement de users.json comme référence...");
  const fileContent = fs.readFileSync(usersJsonPath, 'utf8');
  usersFromFile = JSON.parse(fileContent);
  console.log(`   ✓ ${usersFromFile.length} utilisateurs trouvés dans le fichier\n`);
}

async function rebuild() {
  const client = await MongoClient.connect(uri);

  try {
    const db = client.db();
    console.log("✅ Connecté à MongoDB\n");

    // Étape 1: Récupérer les anciennes données pour l'historique
    console.log("📊 Récupération des anciennes données...");
    const oldUsers = await db.collection("users").find({}).toArray();
    const oldPayments = await db.collection("brunch").find({}).sort({ paymentDate: 1 }).toArray();
    
    console.log(`   - ${oldUsers.length} utilisateurs`);
    console.log(`   - ${oldPayments.length} paiements dans brunch\n`);

    // Étape 2: Construire les nouveaux utilisateurs
    console.log("🔨 Construction de la nouvelle structure...\n");
    const newUsers = [];

    for (const userRef of usersFromFile) {
      try {
        const userId = new ObjectId(userRef._id.$oid);
        const oldUser = oldUsers.find(u => u._id.toString() === userId.toString());
        
        // Date d'expiration depuis users.json (source de vérité)
        const expiresAt = new Date(userRef.subscriptionEnd.$date);
        const now = new Date();
        const isActive = expiresAt > now;

        // Récupérer l'historique des paiements pour cet utilisateur
        const userPayments = oldPayments
          .filter(p => {
            const paymentUserId = typeof p.userId === 'string' ? p.userId : p.userId?.toString();
            return paymentUserId === userId.toString();
          })
          .map(p => {
            const paymentDate = p.paymentDate ? new Date(p.paymentDate) : new Date();
            const months = parseInt(p.months || "3", 10);
            const type = months === 12 ? "annual" : "quarterly";
            const amount = parseFloat(p.amount || 0);
            
            // Calculer la date d'expiration après ce paiement
            const expiresAfter = new Date(paymentDate);
            expiresAfter.setMonth(expiresAfter.getMonth() + months);
            
            return {
              date: paymentDate,
              amount: amount,
              type: type,
              months: months,
              expiresAt: expiresAfter
            };
          });

        // Dernier paiement
        const lastPayment = userPayments.length > 0 
          ? userPayments[userPayments.length - 1]
          : null;

        // Déterminer le type actuel
        const daysUntilExpiration = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
        let currentType = "quarterly";
        if (daysUntilExpiration > 180) {
          currentType = "annual";
        }

        const newUser = {
          _id: userId,
          
          // Infos personnelles
          name: userRef.name,
          surname: userRef.surname,
          email: userRef.email,
          
          // Login (pour le futur)
          role: "user",
          
          // Abonnement - STRUCTURE SIMPLE
          subscription: {
            expiresAt: expiresAt,
            isActive: isActive,
            currentType: currentType,
            lastPaymentDate: lastPayment ? lastPayment.date : expiresAt,
            lastPaymentAmount: lastPayment ? lastPayment.amount : 0,
            history: userPayments
          },
          
          // Metadata
          createdAt: oldUser?.createdAt || new Date(),
          updatedAt: new Date()
        };

        newUsers.push(newUser);
        
        const statusIcon = isActive ? '✅' : '❌';
        console.log(`${statusIcon} ${newUser.name} ${newUser.surname}`);
        console.log(`   Expire: ${expiresAt.toLocaleDateString('fr-FR')}`);
        console.log(`   Paiements: ${userPayments.length}`);
        console.log(`   Statut: ${isActive ? 'Actif' : 'Expiré'}\n`);

      } catch (error) {
        console.error(`❌ Erreur pour ${userRef.name}:`, error.message);
      }
    }

    // Étape 3: Sauvegarder dans MongoDB
    console.log("\n💾 Sauvegarde dans MongoDB...\n");
    
    // Supprimer l'ancienne collection users
    await db.collection("users").drop().catch(() => {});
    console.log("   ✓ Ancienne collection supprimée");
    
    // Insérer les nouveaux users
    if (newUsers.length > 0) {
      await db.collection("users").insertMany(newUsers);
      console.log(`   ✓ ${newUsers.length} utilisateurs insérés\n`);
    }

    // Créer des index pour les performances
    await db.collection("users").createIndex({ email: 1 }, { unique: true });
    await db.collection("users").createIndex({ "subscription.expiresAt": -1 });
    await db.collection("users").createIndex({ "subscription.isActive": 1 });
    console.log("   ✓ Index créés\n");

    // Étape 4: Statistiques finales
    console.log("📊 Résumé:\n");
    const activeCount = newUsers.filter(u => u.subscription.isActive).length;
    const expiredCount = newUsers.length - activeCount;
    const totalRevenue = newUsers.reduce((sum, u) => {
      return sum + u.subscription.history.reduce((s, h) => s + h.amount, 0);
    }, 0);

    console.log(`   Total utilisateurs: ${newUsers.length}`);
    console.log(`   Actifs: ${activeCount}`);
    console.log(`   Expirés: ${expiredCount}`);
    console.log(`   Revenus totaux: ${totalRevenue.toFixed(2)} CHF\n`);

    // Étape 5: Nettoyer les anciennes collections (optionnel)
    console.log("🧹 Nettoyage optionnel des anciennes collections:");
    console.log("   - Collection 'subscriptions' peut être supprimée");
    console.log("   - Collection 'brunch' peut être archivée\n");
    
    const choice = "keep"; // Changez en "delete" pour supprimer
    if (choice === "delete") {
      await db.collection("subscriptions").drop().catch(() => {});
      console.log("   ✓ Collection 'subscriptions' supprimée");
      await db.collection("brunch").drop().catch(() => {});
      console.log("   ✓ Collection 'brunch' supprimée\n");
    } else {
      console.log("   ℹ️  Collections conservées (modifiez le script pour les supprimer)\n");
    }

    console.log("✨ Reconstruction terminée avec succès!\n");
    console.log("📝 Structure finale:");
    console.log("   - UNE collection: users");
    console.log("   - UNE source de vérité: subscription.expiresAt");
    console.log("   - Historique complet dans subscription.history");
    console.log("   - Prêt pour l'authentification (champ role)\n");

  } catch (error) {
    console.error("\n❌ Erreur lors de la reconstruction:", error);
    process.exit(1);
  } finally {
    await client.close();
    console.log("👋 Déconnecté de MongoDB");
  }
}

rebuild().catch(console.error);
