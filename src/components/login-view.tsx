"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { Lock, User, AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";

export function LoginView() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!username || !password) {
      setError("Por favor, preencha todos os campos.");
      setLoading(false);
      return;
    }

    const success = await login(username, password);
    if (!success) {
      setError("Credenciais inválidas. Tente admin@invest.com (senha: admin123).");
    }
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#050505] overflow-hidden px-4">
      {/* Background blobs for premium depth effect */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-600/10 rounded-full filter blur-[100px] animate-pulse duration-[6000ms]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-900/10 rounded-full filter blur-[100px] animate-pulse duration-[8000ms]" />

      <div className="w-full max-w-md z-10">
        {/* Logo/Brand Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-600/30 mb-3 border border-red-500/20">
            <span className="text-white font-extrabold text-2xl tracking-tighter">eK</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Portal do <span className="text-red-500">Investidor</span>
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Gestão de horas & transparência de investimentos
          </p>
        </div>

        {/* Login Card */}
        <div className="glass-panel rounded-2xl p-8 border border-white/5 shadow-2xl relative overflow-hidden">
          {/* Top subtle red light line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-red-600 to-transparent" />

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center gap-2 bg-red-950/40 border border-red-900/50 text-red-400 p-3 rounded-lg text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Username Input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">
                Usuário / E-mail
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="exemplo@invest.com"
                  className="w-full pl-10 pr-4 py-3 bg-[#0d0d0d] border border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-950/40 transition-all text-sm"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">
                  Senha
                </label>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 bg-[#0d0d0d] border border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-950/40 transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-red-600/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Autenticando...
                </>
              ) : (
                "Acessar Painel"
              )}
            </button>
          </form>

          {/* Quick Mock Instructions */}
          <div className="mt-8 pt-6 border-t border-zinc-900 text-center">
            <span className="text-xs text-zinc-500 block">Contas demonstrativas disponíveis:</span>
            <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-zinc-400">
              <div className="bg-[#0b0b0b] p-2 rounded border border-zinc-900">
                <span className="font-semibold block text-red-400">Investidor Alfa</span>
                <span>alfa@invest.com</span>
                <span className="block mt-0.5 text-zinc-600">senha: alfa123</span>
              </div>
              <div className="bg-[#0b0b0b] p-2 rounded border border-zinc-900">
                <span className="font-semibold block text-red-400">Master Admin</span>
                <span>admin@invest.com</span>
                <span className="block mt-0.5 text-zinc-600">senha: admin123</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
