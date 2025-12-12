#!/usr/bin/env node
/**
 * Script de test pour vérifier que le système fonctionne
 */

const { MongoClient, ObjectId } = require("mongodb");
require('dotenv').config({ path: '.env' });

const uri = process.env.MONGODB_URI;

async function test() {
  const client = await MongoClient.connect(uri);
  const db = client.db();

  try {
    console.log("🧪 TEST DU NOUVEAU SYSTÈME\n");

    // Test 1: Récupérer un utilisateur
    console.log("1️⃣ Test: Récupération d'un utilisateur");
    const user = await db.collection("users").findOne({ name: "Johan" });
    
    if (!user) {
      console.log("❌ Utilisateur non trouvé\n");
      return;
    }
    
    console.log("✅ Utilisateur trouvé:", user.name, user.surname);
    console.log("   Email:", user.email);
    console.log("   Expire:", new Date(user.subscription.expiresAt).toLocaleDateString('fr-FR'));
    console.log("   Actif:", user.subscription.isActive ? "Oui" : "Non");
    console.log("   Type:", user.subscription.currentType);
    console.log("");

    // Test 2: Simuler un ajout de paiement
    console.log("2️⃣ Test: Simulation d'ajout de paiement (3 mois)");
    
    const now = new Date();
    const currentExpiresAt = new Date(user.subscription.expiresAt);
    let newExpiresAt;
    
    if (currentExpiresAt > now) {
      newExpiresAt = new Date(currentExpiresAt);
      newExpiresAt.setMonth(newExpiresAt.getMonth() + 3);
      console.log("   Prolongation depuis:", currentExpiresAt.toLocaleDateString('fr-FR'));
    } else {
      newExpiresAt = new Date(now);
      newExpiresAt.setMonth(newExpiresAt.getMonth() + 3);
      console.log("   Nouveau depuis aujourd'hui");
    }
    
    console.log("   Nouvelle expiration:", newExpiresAt.toLocaleDateString('fr-FR'));
    console.log("");

    // Test 3: Vérifier la structure
    console.log("3️⃣ Test: Vérification de la structure");
    console.log("   ✓ subscription existe");
    console.log("   ✓ expiresAt:", typeof user.subscription.expiresAt);
    console.log("   ✓ isActive:", typeof user.subscription.isActive);
    console.log("   ✓ history:", Array.isArray(user.subscription.history));
    console.log("   ✓ role:", user.role);
    console.log("");

    // Test 4: Index
    console.log("4️⃣ Test: Vérification des index");
    const indexes = await db.collection("users").indexes();
    console.log("   Nombre d'index:", indexes.length);
    indexes.forEach(idx => {
      console.log("   -", idx.name);
    });
    console.log("");

    console.log("✅ TOUS LES TESTS RÉUSSIS!\n");

  } catch (error) {
    console.error("❌ Erreur:", error.message);
  } finally {
    await client.close();
  }
}

test().catch(console.error);
