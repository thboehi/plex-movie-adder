// app/brunch/page.js
"use client";

import { useState, useEffect } from "react";
import LoginForm from "../components/LoginForm";
import DecryptedText from '../components/DecryptedText';
import Hero from "../components/Hero";
import Navbar from "../components/Navbar";
import { set } from "date-fns";

export default function Brunch() {

  const [authenticated, setAuthenticated] = useState(false);
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [modalStep, setModalStep] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState("");
  const [paymentData, setPaymentData] = useState({ amount: "", months: "1" });
  const [newUser, setNewUser] = useState({ name: "", surname: "", email: "" });
  

  useEffect(() => {
    // Vérifie l'authentification en appelant l'API dédiée
    async function checkAuth() {
      try {
        const res = await fetch("/api/check-auth");
        const data = await res.json();
        setAuthenticated(data.authenticated);
        setAdminAuthenticated(data.adminAuthenticated);
        setLoading(false);
      } catch (error) {
        console.error("Erreur lors de la vérification de l'authentification", error);
        setAuthenticated(false);
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  useEffect(() => {
    if (authenticated) {
      fetchUsers();
    }
  }, [authenticated]);

  async function fetchUsers() {
    try {
      if (adminAuthenticated) {
        const res = await fetch("/api/users");
        const data = await res.json();
        setUsers(data);
        // Simuler une attente de 3 secondes
        await new Promise(resolve => setTimeout(resolve, 3000));
        setUsersLoading(false);
      } else {
        const res = await fetch("/api/users/public");
        const data = await res.json();
        setUsers(data);
        await new Promise(resolve => setTimeout(resolve, 3000));
        setUsersLoading(false);
      }
      
    } catch (error) {
      console.error("Erreur chargement utilisateurs", error);
    }
  }


  async function handleAddPayment() {
    if (!selectedUser || !paymentData.amount){
        return;
    }
    
    try {
      await fetch("/api/brunch/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser,
          amount: paymentData.amount,
          months: paymentData.months,
        }),
      });
      closeModal();
    } catch (error) {
      console.error("Erreur ajout paiement", error);
    }
  }

  async function handleAddUser() {
    if (!newUser.name || !newUser.surname || !newUser.email) return;
    
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });
      const userData = await res.json();

      setSelectedUser(userData._id);
      fetchUsers();
      setModalStep(3);
    } catch (error) {
      console.error("Erreur ajout utilisateur", error);
    }
  }

  const handleLoginSuccess = (role) => {
    if (role === "admin") {
      setAuthenticated(true);
      setAdminAuthenticated(true);
    } else {
      setAuthenticated(true);
      setAdminAuthenticated(false);
    }
  }

  function openModal() {
    setIsModalOpen(true);
    setModalStep(1);
  }

  function closeModal() {
    setIsModalOpen(false);
    setModalStep(1);
    setSelectedUser("");
    setPaymentData({ amount: "", months: "1" });
    setNewUser({ name: "", surname: "", email: "" });
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-black p-8">
        <div className="flex justify-center items-center">
          {/* Demi rond stylisé qui tourne */}
          <div className="w-12 h-12 border-4 border-blue-700 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return <LoginForm onSuccess={handleLoginSuccess} />;
  }

  return (
    <>
        <Navbar current={"abonnements"} />
        
        <main className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-black p-4 lg:p-8">
        
        <Hero adminAuthenticated={adminAuthenticated} subtitle="Abonnements" />
        
        {/* Contenu principal */}
        {adminAuthenticated && (
            <div>
            <button onClick={openModal} className="bg-blue-700 hover:bg-blue-600 transition-colors text-white px-4 py-2 mb-8 rounded-lg">Ajouter un paiement</button>
            
            {isModalOpen && (
                <div className="fixed z-50 inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-filter">
                <div className="bg-white rounded-lg shadow-lg p-6 w-96">
                    {modalStep === 1 && (
                    <div>
                        <h2 className="text-lg font-bold mb-4">Sélectionner un utilisateur</h2>
                        <select
                        className="w-full border rounded-lg p-2"
                        value={selectedUser}
                        onChange={(e) => {
                            setSelectedUser(e.target.value);
                            setModalStep(e.target.value === "new" ? 2 : 3);
                        }}
                        >
                        <option value="">Choisir un utilisateur</option>
                        {users.map(user => (
                            <option key={user._id} value={user._id}>{user.name} {user.surname}</option>
                        ))}
                        <option value="new" key="new">Nouvel utilisateur</option>
                        </select>
                    </div>
                    )}
                    {modalStep === 2 && (
                    <div>
                        <h2 className="text-lg font-bold mb-4">Ajouter un utilisateur</h2>
                        <input type="text" placeholder="Prénom" className="w-full border rounded-lg p-2 mb-2" value={newUser.name} onChange={(e) => setNewUser({...newUser, name: e.target.value})} />
                        <input type="text" placeholder="Nom" className="w-full border rounded-lg p-2 mb-2" value={newUser.surname} onChange={(e) => setNewUser({...newUser, surname: e.target.value})} />
                        <input type="email" placeholder="Email" className="w-full border rounded-lg p-2 mb-4" value={newUser.email} onChange={(e) => setNewUser({...newUser, email: e.target.value})} />
                        <button onClick={handleAddUser} className="bg-blue-700 hover:bg-blue-600 transition-colors text-white px-4 py-2 rounded-lg">Ajouter</button>
                    </div>
                    )}
                    {modalStep === 3 && (
                    <div>
                        <h2 className="text-lg font-bold mb-4">Ajouter un paiement</h2>
                        <input type="number" placeholder="Montant" className="w-full border rounded-lg p-2 mb-2" value={paymentData.amount} onChange={(e) => setPaymentData({...paymentData, amount: e.target.value})} />
                        <select className="w-full border rounded-lg p-2 mb-4" value={paymentData.months} onChange={(e) => setPaymentData({...paymentData, months: e.target.value})}>
                        <option value="1">1 mois</option>
                        <option value="12">12 mois</option>
                        </select>
                        <button onClick={handleAddPayment} className="bg-blue-500 text-white px-4 py-2 rounded-lg">Confirmer</button>
                    </div>
                    )}
                    <button onClick={closeModal} className="mt-4 text-red-500">Annuler</button>
                </div>
                </div>
            )}
            </div>
            )}

            <div>
            {/* Afficher chaque utilisateur et sa date d'expiration de l'abonnement */}
            <h2 className="text-lg font-bold mb-4 text-center">Abonnements aux brunchs actifs</h2>
            <div className="flex flex-col items-center gap-2">
            {usersLoading ? (
              // Skeleton loader pour les cartes utilisateurs
              [...Array(4)].map((_, index) => (
                <div 
                  key={index} 
                  className="flex flex-col w-full items-center bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 p-4 rounded-md text-sm"
                >
                  <div className="relative w-full">
                  <div className="h-7 w-32 mb-3 mx-auto bg-gray-200 dark:bg-gray-700 rounded-md overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 animate-[shimmer_1.5s_infinite]"></div>
                </div>
                <div className="h-4 w-24 mx-auto bg-gray-200 dark:bg-gray-700 rounded-md mb-2 overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 animate-[shimmer_1.5s_infinite]"></div>
                </div>
                <div className="h-4 w-20 mx-auto bg-gray-200 dark:bg-gray-700 rounded-md overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 animate-[shimmer_1.5s_infinite]"></div>
                </div>
                  </div>
                </div>
              ))
              ) : (
                users.map(user => {
                  // Calculer le temps restant
                  const now = new Date();
                  const subscriptionEnd = new Date(user.subscriptionEnd);
                  const timeRemaining = subscriptionEnd - now;
                  const daysRemaining = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
                  const hoursRemaining = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                  
                  // Vérifier si l'abonnement se termine dans 7 jours ou moins
                  const isAboutToExpire = daysRemaining <= 7;
                  
                  // Construire le message du temps restant
                  let timeRemainingMessage;
                  if (daysRemaining < 0) {
                      timeRemainingMessage = "Abonnement expiré";
                  } else if (isAboutToExpire) {
                      timeRemainingMessage = `Abonnement se termine dans ${daysRemaining} jour${daysRemaining !== 1 ? 's' : ''} et ${hoursRemaining} heure${hoursRemaining !== 1 ? 's' : ''}`;
                  } else {
                      timeRemainingMessage = "Abonnement jusqu'au";
                  }
                  
                  return (
                      <div 
                      key={user._id} 
                      className={`flex flex-col w-full items-center bg-white border ${isAboutToExpire ? 'border-red-500 dark:border-red-600' : 'border-gray-200 hover:border-blue-300 hover:dark:border-blue-900'} dark:bg-gray-950 ${!isAboutToExpire ? 'dark:border-gray-800' : ''} p-4 rounded-md text-sm transition-all hover:scale-105`}
                      >
                      <p className="text-xl font-bold">{user.name} {user.surname}</p>
                      <p className={`text-xs mt-3 ${isAboutToExpire ? 'text-red-600 dark:text-red-400' : ''}`}>{timeRemainingMessage}</p>
                      <p className={`font-bold ${isAboutToExpire ? 'text-red-600 dark:text-red-400' : ''}`}>
                          {isAboutToExpire ? '' : new Date(user.subscriptionEnd).toLocaleDateString()}
                      </p>
                      </div>
                  );
                  })
              )}
            </div>
            </div>
        
            <div className="m-20 p-10 w-full flex justify-center opacity-10 hover:opacity-80 transition-opacity">
            <p className="text-gray-400 dark:text-gray-700">Site web créé et maintenu par{" "}
                <a className="group text-neon-blue font-bold transition-all hover:underline" href="https://thbo.ch" target="_blank">
                <DecryptedText
                    text="thbo.ch"
                    speed={80}
                    maxIterations={10}
                    className="group-hover:underline"
                    />
                </a>
            </p>
            </div>
        
        </main>
    </>
  );
}