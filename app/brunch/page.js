// app/brunch/page.js
"use client";

import { useState, useEffect } from "react";
import LoginForm from "../components/LoginForm";
import DecryptedText from '../components/DecryptedText';
import Hero from "../components/Hero";
import Navbar from "../components/Navbar";
import { Select, Option, Typography } from "@material-tailwind/react";

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
        setUsersLoading(false);
      } else {
        const res = await fetch("/api/users/public");
        const data = await res.json();
        setUsers(data);
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

  // Liste d'utilisateurs à afficher selon le rôle:
  // - Admin: aucun filtre, ordre inchangé (par date d'expiration tel que fourni).
  // - Non-admin: filtrer les expirés depuis > 1 mois, trier par prénom (name).
  function getDisplayUsers() {
    if (usersLoading) return [];
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    if (adminAuthenticated) {
      return users;
    }

    return [...users]
      .filter(u => {
        if (!u?.subscriptionEnd) return true; // on garde si pas de date connue
        const end = new Date(u.subscriptionEnd);
        if (isNaN(end)) return true; // on garde si date invalide
        return end >= oneMonthAgo; // on cache si expiré depuis > 1 mois
      })
      .sort((a, b) => (a.name || "").localeCompare(b.name || "", "fr", { sensitivity: "base" }));
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-black p-8">
        <div className="flex justify-center items-center">
          {/* Demi rond stylisé qui tourne */}
          <div className="w-12 h-12 border-4 border-orange border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return <LoginForm onSuccess={handleLoginSuccess} />;
  }

  return (
    <>
        <Navbar current={"abonnements"} authenticated={authenticated} adminAuthenticated={adminAuthenticated} />
        
        <main className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-black p-4 lg:p-8">
        
        <Hero adminAuthenticated={adminAuthenticated} subtitle="Abonnements" />
        
        {/* Contenu principal */}
        {adminAuthenticated && (
          <div>
            <button onClick={openModal} className="block border border-gray-200 dark:border-gray-800 py-2 px-3 text-gray-900 rounded-lg bg-white dark:text-white dark:bg-gray-900 dark:hover:text-white hover:border-orange transition-colors w-full self-end place-self-end cursor-pointer mb-12">Ajouter un paiement</button>
            
            {isModalOpen && (
              <div className="fixed z-50 inset-0 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm transition-all duration-300">
                <div 
                  className="bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-800 p-6 w-96 max-w-[90%] transform transition-all duration-300 ease-in-out"
                  style={{
                    animation: "modalFadeIn 0.3s ease-out forwards"
                  }}
                >
                  {modalStep === 1 && (
                    <div className="space-y-4">
                      <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white flex items-center">
                        <svg className="w-5 h-5 mr-2 text-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        Sélectionner un utilisateur
                      </h2>
                      
                      <div className="w-full">
                        <Select
                          label="Choisir un utilisateur"
                          value={selectedUser}
                          onChange={(value) => {
                            setSelectedUser(value);
                            setTimeout(() => {
                              setModalStep(value === "new" ? 2 : 3);
                            }, 150);
                          }}
                          className="border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white"
                          labelProps={{
                            className: "text-gray-700 dark:text-gray-300"
                          }}
                          menuProps={{
                            className: "bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700"
                          }}
                          color="amber"
                        >
                          {users.map(user => (
                            <Option key={user._id} value={user._id} className="text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800">
                              <div className="flex items-center gap-2">
                                <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                  <Typography className="font-bold text-xs">
                                    {user.name.charAt(0)}{user.surname.charAt(0)}
                                  </Typography>
                                </div>
                                <Typography className="font-normal">
                                  {user.name} {user.surname}
                                </Typography>
                              </div>
                            </Option>
                          ))}
                          <Option value="new" className="text-orange font-medium border-t border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800">
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-full bg-orange bg-opacity-20 flex items-center justify-center">
                                <svg className="w-3 h-3 text-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                              </div>
                              <Typography className="font-medium">
                                Nouvel utilisateur
                              </Typography>
                            </div>
                          </Option>
                        </Select>
                      </div>
                      
                      {selectedUser && (
                        <div className="mt-4 animate-fadeIn">
                          <div className="p-3 border border-gray-200 dark:border-gray-800 rounded-lg bg-gray-50 dark:bg-gray-900 flex justify-between items-center">
                            <Typography className="text-gray-700 dark:text-gray-300 text-sm">
                              {selectedUser === "new" 
                                ? "Créer un nouvel utilisateur" 
                                : `Utilisateur sélectionné: ${users.find(u => u._id === selectedUser)?.name || ""} ${users.find(u => u._id === selectedUser)?.surname || ""}`
                              }
                            </Typography>
                            <button 
                              onClick={() => {
                                setTimeout(() => {
                                  setModalStep(selectedUser === "new" ? 2 : 3);
                                }, 150);
                              }}
                              className="bg-orange text-white p-2 rounded-md hover:bg-opacity-90 transition-all"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {modalStep === 2 && (
                    <div className="space-y-4 transform transition-all duration-300 ease-in-out" style={{ animation: "slideIn 0.3s ease-out forwards" }}>
                      <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white flex items-center">
                        <svg className="w-5 h-5 mr-2 text-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                        Ajouter un utilisateur
                      </h2>
                      
                      <div className="space-y-3">
                        <input 
                          type="text" 
                          placeholder="Prénom" 
                          className="w-full border border-gray-300 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white focus:border-orange focus:ring-2 focus:ring-orange focus:ring-opacity-50 outline-none transition-colors" 
                          value={newUser.name} 
                          onChange={(e) => setNewUser({...newUser, name: e.target.value})} 
                        />
                        
                        <input 
                          type="text" 
                          placeholder="Nom" 
                          className="w-full border border-gray-300 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white focus:border-orange focus:ring-2 focus:ring-orange focus:ring-opacity-50 outline-none transition-colors" 
                          value={newUser.surname} 
                          onChange={(e) => setNewUser({...newUser, surname: e.target.value})} 
                        />
                        
                        <input 
                          type="email" 
                          placeholder="Email" 
                          className="w-full border border-gray-300 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white focus:border-orange focus:ring-2 focus:ring-orange focus:ring-opacity-50 outline-none transition-colors" 
                          value={newUser.email} 
                          onChange={(e) => setNewUser({...newUser, email: e.target.value})} 
                        />
                        
                        <button 
                          onClick={handleAddUser} 
                          className="w-full bg-orange hover:bg-opacity-90 transition-colors text-white font-medium px-4 py-3 rounded-lg mt-2 flex items-center justify-center"
                        >
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          Ajouter l'utilisateur
                        </button>
                      </div>
                    </div>
                  )}

                  {modalStep === 3 && (
                    <div className="space-y-4 transform transition-all duration-300 ease-in-out" style={{ animation: "slideIn 0.3s ease-out forwards" }}>
                      <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white flex items-center">
                        <svg className="w-5 h-5 mr-2 text-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        Ajouter un paiement
                      </h2>
                      
                      <div className="space-y-3">
                        <div className="relative">
                          <input 
                            type="number" 
                            placeholder="0" 
                            className="w-full border border-gray-300 dark:border-gray-700 rounded-lg p-3 pl-12 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white focus:border-orange focus:ring-2 focus:ring-orange focus:ring-opacity-50 outline-none transition-colors" 
                            value={paymentData.amount} 
                            onChange={(e) => setPaymentData({...paymentData, amount: e.target.value})} 
                          />
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                            CHF
                          </span>
                        </div>
                        
                        <Select
                          label="Durée d'abonnement"
                          value={paymentData.months}
                          onChange={(value) => setPaymentData({...paymentData, months: value})}
                          className="border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white"
                          labelProps={{
                            className: "text-gray-700 dark:text-gray-300"
                          }}
                          menuProps={{
                            className: "bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700"
                          }}
                          color="amber"
                        >
                          <Option value="1" className="text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800">
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                <Typography className="font-bold text-xs">1</Typography>
                              </div>
                              <Typography className="font-normal">
                                1 mois d'abonnement
                              </Typography>
                            </div>
                          </Option>
                          
                          <Option value="12" className="text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800">
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-full bg-orange bg-opacity-20 flex items-center justify-center">
                                <Typography className="font-bold text-xs text-orange">12</Typography>
                              </div>
                              <Typography className="font-normal">
                                12 mois d'abonnement
                              </Typography>
                            </div>
                          </Option>
                        </Select>
                        
                        <button 
                          onClick={handleAddPayment} 
                          className="w-full bg-orange hover:bg-opacity-90 transition-colors text-white font-medium px-4 py-3 rounded-lg mt-2 flex items-center justify-center"
                        >
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Confirmer le paiement
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <button 
                    onClick={closeModal} 
                    className="mt-6 w-full border border-gray-200 dark:border-gray-800 py-2 px-3 text-gray-700 dark:text-gray-300 rounded-lg hover:border-orange dark:hover:border-orange transition-colors flex items-center justify-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
          )}

            <div className="w-full max-w-2xl mx-auto mb-10">
              <h2 className="sr-only">Tarifs</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Mensuel */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">Mensuel</span>
                  </div>
                  <div className="flex items-end gap-1">
                    <span className="text-3xl font-bold text-gray-900 dark:text-white">9.90&nbsp;CHF</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 mb-1">/mois</span>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-xs">
                    <span className="text-gray-600 dark:text-gray-300">Paiement&nbsp;:</span>
                    <span className="px-2 py-1 rounded-md bg-orange/10 text-orange font-medium">Revolut (préféré)</span>
                    <span className="px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">TWINT</span>
                  </div>
                </div>

                {/* Annuel (mis en avant) */}
                <div className="relative rounded-xl border border-orange/60 bg-white dark:bg-gray-900 p-5 ring-1 ring-orange/20">
                  <span className="absolute -top-3 right-3 text-[10px] uppercase tracking-wide bg-orange text-white px-2 py-1 rounded-md shadow">Le plus avantageux</span>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-orange/10 text-orange">Annuel</span>
                  </div>
                  <div className="flex items-end gap-1">
                    <span className="text-3xl font-bold text-orange">100&nbsp;CHF</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 mb-1">/an</span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 line-through mt-1">
                    {(9.90 * 12).toFixed(2)}&nbsp;CHF
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-xs">
                    <span className="text-gray-600 dark:text-gray-300">Paiement&nbsp;:</span>
                    <span className="px-2 py-1 rounded-md bg-orange/10 text-orange font-medium">Revolut (préféré)</span>
                    <span className="px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">TWINT</span>
                  </div>
                </div>
              </div>
            </div>

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
                getDisplayUsers().map(user => {
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
                      className={`flex flex-col w-full items-center bg-white border ${isAboutToExpire ? 'border-red-500 dark:border-red-600' : 'border-gray-200'} dark:bg-gray-900 ${!isAboutToExpire ? 'dark:border-gray-800' : ''} p-4 rounded-md text-sm transition-all hover:scale-105`}
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
                <a className="group text-orange font-bold transition-all hover:underline" href="https://thbo.ch" target="_blank">
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