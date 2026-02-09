"use client";

import { AuthProvider, useAuth } from "./AuthContext";
import LoginForm from "./LoginForm";
import Navbar from "./Navbar";
import PageTransition from "./PageTransition";

function LayoutContent({ children }) {
  const { authenticated, loading, handleLoginSuccess } = useAuth();

  // Loading spinner
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black p-8">
        <div className="flex justify-center items-center">
          <div className="w-12 h-12 border-4 border-orange border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  // Login screen
  if (!authenticated) {
    return <LoginForm onSuccess={handleLoginSuccess} />;
  }

  // Authenticated layout: persistent Navbar + animated page content
  return (
    <>
      <Navbar />
      <PageTransition>
        {children}
      </PageTransition>
    </>
  );
}

export default function ClientLayout({ children }) {
  return (
    <AuthProvider>
      <LayoutContent>{children}</LayoutContent>
    </AuthProvider>
  );
}
