"use client";

import React from "react";
import { AuthProvider, useAuth } from "@/context/auth-context";
import { LoginView } from "@/components/login-view";
import { DashboardView } from "@/components/dashboard-view";

function HomeContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-zinc-800 border-t-red-600 rounded-full animate-spin" />
        <span className="text-sm text-zinc-400 font-medium">Carregando painel...</span>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  return <DashboardView />;
}

export default function Home() {
  return (
    <AuthProvider>
      <HomeContent />
    </AuthProvider>
  );
}
