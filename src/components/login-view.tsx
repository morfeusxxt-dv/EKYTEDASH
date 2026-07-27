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
      setError("Preencha todos os campos.");
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-black px-4">
      <div className="w-full max-w-sm">
        {/* Brand Header */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center">
            <span className="text-white font-extrabold text-sm tracking-tighter">eK</span>
          </div>
          <span className="text-md font-bold tracking-tight text-white uppercase">
            Ekyte <span className="text-zinc-500 font-medium">Dash</span>
          </span>
        </div>

        {/* Minimal Login Form */}
        <div className="bg-[#09090b] border border-zinc-900 rounded p-6">
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-white">Login do Investidor</h2>
            <p className="text-xs text-zinc-500 mt-1">Acesse os apontamentos e relatórios de horas.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-2 border border-red-900 bg-red-950/20 text-red-500 p-3 rounded text-xs">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Usuário / E-mail
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-600">
                  <User className="w-3.5 h-3.5" />
                </span>
                <input
                  type="email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="exemplo@invest.com"
                  className="w-full pl-9 pr-3 py-2 bg-black border border-zinc-900 rounded text-xs text-white placeholder-zinc-700 transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Senha
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-600">
                  <Lock className="w-3.5 h-3.5" />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-9 py-2 bg-black border border-zinc-900 rounded text-xs text-white placeholder-zinc-700 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-600 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-medium text-xs rounded transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Autenticando...
                </>
              ) : (
                "Entrar no Painel"
              )}
            </button>
          </form>
        </div>

        {/* Demo Credentials Box */}
        <div className="mt-4 border border-zinc-900 bg-black p-4 rounded">
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-2">Acesso Rápido</span>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="bg-[#09090b] p-2 border border-zinc-900 rounded">
              <span className="font-semibold block text-white">Investidor Alfa</span>
              <span className="text-zinc-400 block mt-0.5">alfa@invest.com</span>
              <span className="text-zinc-600 block">senha: alfa123</span>
            </div>
            <div className="bg-[#09090b] p-2 border border-zinc-900 rounded">
              <span className="font-semibold block text-white">Master Admin</span>
              <span className="text-zinc-400 block mt-0.5">admin@invest.com</span>
              <span className="text-zinc-600 block">senha: admin123</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
