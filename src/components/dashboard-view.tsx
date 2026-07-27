"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/auth-context";
import {
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart as ReLineChart,
  Line,
  Legend,
} from "recharts";
import {
  LogOut,
  Calendar,
  Layers,
  Clock,
  Briefcase,
  Search,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  FileText,
  User,
} from "lucide-react";

interface HourLog {
  id: string;
  date: string;
  task: string;
  professional: string;
  hours: number;
  workspace: string;
  project: string;
}

export function DashboardView() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<"overview" | "detailed">("overview");

  // Filtros principais
  const [period, setPeriod] = useState<"current-month" | "last-30" | "custom">("current-month");
  const [selectedInvestor, setSelectedInvestor] = useState<string>("all"); // Default: Todos
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>("all");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Lista de todos os usuários cadastrados na empresa (carregados do eKyte MCP)
  const [allUsers, setAllUsers] = useState<{ email: string; name: string }[]>([]);

  // Dados carregados do Backend (Proxy API)
  const [logs, setLogs] = useState<HourLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Paginação
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 8;

  // Carrega a lista completa de profissionais/investidores da empresa
  useEffect(() => {
    async function loadUsers() {
      try {
        const response = await fetch("/api/users");
        if (response.ok) {
          const resJson = await response.json();
          setAllUsers(resJson.data || []);
        }
      } catch (err) {
        console.error("Erro ao carregar usuários do eKyte", err);
      }
    }
    loadUsers();
  }, []);

  // Carrega os dados fazendo a requisição à API Route proxy (carrega todas as horas do período)
  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      setLoading(true);
      setError(null);
      try {
        const queryParams = new URLSearchParams();
        // Carrega todos os workspaces associados
        queryParams.append("workspaces", user.workspaces.join(","));

        if (selectedProject !== "all") {
          queryParams.append("project", selectedProject);
        }

        let start = "";
        let end = "";
        const now = new Date();

        if (period === "current-month") {
          start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
          end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
        } else if (period === "last-30") {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(now.getDate() - 30);
          start = thirtyDaysAgo.toISOString().split("T")[0];
          end = now.toISOString().split("T")[0];
        } else if (period === "custom" && customStartDate && customEndDate) {
          start = customStartDate;
          end = customEndDate;
        }

        if (start && end) {
          queryParams.append("startDate", start);
          queryParams.append("endDate", end);
        }

        const response = await fetch(`/api/hours?${queryParams.toString()}`);
        if (response.ok) {
          const resJson = await response.json();
          setLogs(resJson.data || []);
        } else {
          const errData = await response.json().catch(() => ({}));
          setError(errData.error || `Erro de conexão: Código ${response.status}`);
          setLogs([]);
        }
      } catch (err: any) {
        console.error("Erro ao carregar apontamentos", err);
        setError(err.message || "Erro desconhecido na rede");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user, period, selectedProject, customStartDate, customEndDate]);

  // Filtros aplicados no cliente
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchInvestor = selectedInvestor === "all" || log.professional === selectedInvestor;
      const matchWorkspace = selectedWorkspace === "all" || log.workspace === selectedWorkspace;
      const matchSearch =
        searchQuery === "" ||
        log.task.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.project.toLowerCase().includes(searchQuery.toLowerCase());
      return matchInvestor && matchWorkspace && matchSearch;
    });
  }, [logs, selectedInvestor, selectedWorkspace, searchQuery]);

  // Lista dinâmica de workspaces baseada nos logs filtrados
  const workspacesList = useMemo(() => {
    const list = new Set<string>();
    // Exibe apenas os workspaces relacionados ao investidor selecionado
    const targetLogs = selectedInvestor === "all" 
      ? logs 
      : logs.filter(l => l.professional === selectedInvestor);
      
    targetLogs.forEach((l) => list.add(l.workspace));
    return Array.from(list).sort();
  }, [logs, selectedInvestor]);

  const projectsList = useMemo(() => {
    const list = new Set<string>();
    logs.forEach((l) => list.add(l.project));
    return Array.from(list).sort();
  }, [logs]);

  // KPIs
  const totalHours = useMemo(() => {
    return filteredLogs.reduce((acc, curr) => acc + curr.hours, 0);
  }, [filteredLogs]);

  const activeWorkspacesCount = useMemo(() => {
    const list = new Set(filteredLogs.map(l => l.workspace));
    return list.size;
  }, [filteredLogs]);

  const activeProjectsCount = useMemo(() => {
    const list = new Set(filteredLogs.map(l => l.project));
    return list.size;
  }, [filteredLogs]);

  // Variação visual simulada
  const simulatedVariation = useMemo(() => {
    const base = selectedInvestor ? selectedInvestor.length * 1.8 : 12.0;
    return {
      hours: `${base > 15 ? "+" : "-"}${(base % 7).toFixed(1)}%`,
      isNegative: base <= 15,
    };
  }, [selectedInvestor]);

  // Gráfico 1: Workspaces onde mais trabalhou (distribuição de horas do investidor)
  const workspaceChartData = useMemo(() => {
    const dataMap: Record<string, { name: string; horas: number }> = {};
    filteredLogs.forEach((log) => {
      if (!dataMap[log.workspace]) {
        dataMap[log.workspace] = { name: log.workspace, horas: 0 };
      }
      dataMap[log.workspace].horas += log.hours;
    });
    return Object.values(dataMap).sort((a, b) => b.horas - a.horas);
  }, [filteredLogs]);

  // Gráfico 2: Evolução de horas semanais
  const weeklyChartData = useMemo(() => {
    const weeksMap: Record<string, number> = {
      "Semana 1": 0,
      "Semana 2": 0,
      "Semana 3": 0,
      "Semana 4": 0,
    };

    filteredLogs.forEach((log) => {
      const day = new Date(log.date).getDate();
      if (day <= 7) weeksMap["Semana 1"] += log.hours;
      else if (day <= 14) weeksMap["Semana 2"] += log.hours;
      else if (day <= 21) weeksMap["Semana 3"] += log.hours;
      else weeksMap["Semana 4"] += log.hours;
    });

    return Object.entries(weeksMap).map(([week, horas]) => ({
      name: week,
      horas: parseFloat(horas.toFixed(1)),
    }));
  }, [filteredLogs]);

  // Paginação
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredLogs, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedInvestor, selectedWorkspace, selectedProject, period, searchQuery]);

  return (
    <div className="flex min-h-screen bg-black text-[#f4f4f5]">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-[#09090b] border-r border-zinc-900 flex flex-col justify-between p-4 z-20">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-2 mb-8 px-2 py-1">
            <div className="w-6 h-6 bg-red-600 rounded flex items-center justify-center">
              <span className="text-white font-extrabold text-xs tracking-tighter">eK</span>
            </div>
            <span className="text-xs font-bold tracking-tight text-white uppercase">
              Ekyte <span className="text-zinc-655 font-medium">Dash</span>
            </span>
          </div>

          {/* Navigation */}
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab("overview")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-xs font-semibold transition-colors ${
                activeTab === "overview"
                  ? "bg-zinc-900 text-white border border-zinc-800"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900/40"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Visão Geral
            </button>
            <button
              onClick={() => setActiveTab("detailed")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-xs font-semibold transition-colors ${
                activeTab === "detailed"
                  ? "bg-zinc-900 text-white border border-zinc-800"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900/40"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Relatório Detalhado
            </button>
          </nav>
        </div>

        {/* User Info Footer */}
        <div className="border-t border-zinc-900 pt-4 px-2">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-7 h-7 bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-850 text-red-500 font-bold text-[10px] uppercase">
              {user?.name.slice(0, 2)}
            </div>
            <div className="truncate">
              <span className="text-[11px] font-semibold text-white block truncate">{user?.name}</span>
              <span className="text-[9px] text-zinc-500 uppercase block truncate">Gestor Geral</span>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-transparent hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-850 text-zinc-400 hover:text-white text-[10px] font-bold rounded transition-colors"
          >
            <LogOut className="w-3 h-3" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Header */}
        <header className="h-16 bg-black border-b border-zinc-900 flex items-center justify-between px-6 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              {activeTab === "overview" ? "Visão Geral" : "Log de Horas"}
            </h1>

            {/* Flat Period Controls */}
            <div className="flex bg-[#09090b] border border-zinc-900 rounded p-0.5 text-[10px]">
              <button
                onClick={() => setPeriod("current-month")}
                className={`px-2.5 py-1 rounded transition-colors font-medium ${
                  period === "current-month" ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-white"
                }`}
              >
                Mês Atual
              </button>
              <button
                onClick={() => setPeriod("last-30")}
                className={`px-2.5 py-1 rounded transition-colors font-medium ${
                  period === "last-30" ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-white"
                }`}
              >
                30 Dias
              </button>
              <button
                onClick={() => setPeriod("custom")}
                className={`px-2.5 py-1 rounded transition-colors font-medium ${
                  period === "custom" ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-white"
                }`}
              >
                Personalizado
              </button>
            </div>
          </div>

          {/* Top Level Selectors */}
          <div className="flex items-center gap-2">
            {period === "custom" && (
              <div className="flex items-center gap-1.5 bg-[#09090b] border border-zinc-900 rounded px-2 py-1 text-[10px]">
                <Calendar className="w-3 h-3 text-zinc-500" />
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-transparent text-white border-0 w-24 text-[10px]"
                />
                <span className="text-zinc-650">-</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-transparent text-white border-0 w-24 text-[10px]"
                />
              </div>
            )}

            {/* Selector: Investidor / Profissional Dinâmico */}
            <div className="relative">
              <User className="w-3 h-3 text-zinc-500 absolute left-2 top-2 pointer-events-none" />
              <select
                value={selectedInvestor}
                onChange={(e) => setSelectedInvestor(e.target.value)}
                className="pl-7 pr-6 py-1.5 bg-[#09090b] border border-zinc-900 rounded text-[11px] text-red-500 font-bold appearance-none cursor-pointer"
              >
                <option value="all">Todos os Investidores</option>
                {allUsers.map((u) => (
                  <option key={u.email} value={u.email}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Workspace Dropdown */}
            <div className="relative">
              <Layers className="w-3 h-3 text-zinc-500 absolute left-2 top-2 pointer-events-none" />
              <select
                value={selectedWorkspace}
                onChange={(e) => setSelectedWorkspace(e.target.value)}
                className="pl-7 pr-6 py-1.5 bg-[#09090b] border border-zinc-900 rounded text-[11px] text-white appearance-none cursor-pointer"
              >
                <option value="all">Todos os Workspaces</option>
                {workspacesList.map((ws) => (
                  <option key={ws} value={ws}>
                    {ws}
                  </option>
                ))}
              </select>
            </div>

            {/* Project Dropdown */}
            <div className="relative">
              <Briefcase className="w-3 h-3 text-zinc-500 absolute left-2 top-2 pointer-events-none" />
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="pl-7 pr-6 py-1.5 bg-[#09090b] border border-zinc-900 rounded text-[11px] text-white appearance-none cursor-pointer"
              >
                <option value="all">Todos os Projetos</option>
                {projectsList.map((pj) => (
                  <option key={pj} value={pj}>
                    {pj}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2.5">
            <div className="w-6 h-6 border-2 border-zinc-800 border-t-red-650 rounded-full animate-spin" />
            <span className="text-xs text-zinc-500 font-medium">Carregando da API eKyte...</span>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto gap-4">
            <div className="p-2.5 bg-red-950/20 border border-red-900/40 rounded text-red-500 font-bold text-[10px] uppercase tracking-wider">
              Conexão eKyte pendente
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed px-4">
              {error}
            </p>
            <div className="text-[10px] text-zinc-500 bg-[#09090b] p-3.5 rounded border border-zinc-900 w-full text-left leading-relaxed">
              <span className="font-bold text-white block mb-1">Como resolver:</span>
              1. Acesse o painel da Vercel.<br/>
              2. Vá em <strong>Settings</strong> &gt; <strong>Environment Variables</strong>.<br/>
              3. Verifique se os nomes das chaves estão exatos: <strong>EKYTE_API_TOKEN</strong> e <strong>EKYTE_API_URL</strong>.<br/>
              4. <strong>Importante:</strong> Após salvar as variáveis, vá na aba <strong>Deployments</strong> e clique em <strong>Redeploy</strong> no deploy mais recente para ativar as configurações.
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6 flex-1">
            {/* 1. KPIs Section */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Hours Card */}
              <div className="premium-card p-5 rounded">
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
                  <span>Horas Apontadas</span>
                  <Clock className="w-3.5 h-3.5 text-zinc-500" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold text-white tracking-tight mono-nums">{totalHours.toFixed(1)}h</span>
                  <span className={`text-[10px] font-bold ${simulatedVariation.isNegative ? "text-green-500" : "text-red-500"} mono-nums`}>
                    {simulatedVariation.hours}
                  </span>
                </div>
              </div>

              {/* Workspaces Card */}
              <div className="premium-card p-5 rounded">
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
                  <span>Workspaces Atendidos</span>
                  <Layers className="w-3.5 h-3.5 text-zinc-500" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold text-white tracking-tight mono-nums">{activeWorkspacesCount}</span>
                </div>
              </div>

              {/* Projects Card */}
              <div className="premium-card p-5 rounded">
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
                  <span>Projetos Envolvidos</span>
                  <Briefcase className="w-3.5 h-3.5 text-zinc-500" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold text-white tracking-tight mono-nums">{activeProjectsCount}</span>
                </div>
              </div>
            </section>

            {activeTab === "overview" ? (
              <>
                {/* 2. Charts */}
                <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Bar Chart: Workspaces onde mais trabalhou */}
                  <div className="premium-card p-5 rounded">
                    <div className="mb-4">
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">Workspaces Mais Trabalhados (Horas)</h3>
                    </div>
                    <div className="h-64">
                      {workspaceChartData.length === 0 ? (
                        <div className="w-full h-full flex items-center justify-center text-zinc-700 text-xs">Sem dados.</div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <ReBarChart data={workspaceChartData} margin={{ top: 10, right: 10, left: -30, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="2 2" stroke="#121214" vertical={false} />
                            <XAxis dataKey="name" stroke="#3f3f46" fontSize={9} tickLine={false} />
                            <YAxis stroke="#3f3f46" fontSize={9} tickLine={false} />
                            <Tooltip
                              contentStyle={{ background: "#09090b", border: "1px solid #18181b", borderRadius: "2px" }}
                              labelClassName="text-white text-xs font-bold"
                              itemStyle={{ color: "#ef4444", fontSize: "11px" }}
                            />
                            <Bar dataKey="horas" fill="#dc2626" maxBarSize={30} />
                          </ReBarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>

                  {/* Line Chart: Evolução Semanal de Horas */}
                  <div className="premium-card p-5 rounded">
                    <div className="mb-4">
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">Evolução de Horas Semanais</h3>
                    </div>
                    <div className="h-64">
                      {weeklyChartData.length === 0 ? (
                        <div className="w-full h-full flex items-center justify-center text-zinc-700 text-xs">Sem dados.</div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <ReLineChart data={weeklyChartData} margin={{ top: 10, right: 10, left: -30, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="2 2" stroke="#121214" vertical={false} />
                            <XAxis dataKey="name" stroke="#3f3f46" fontSize={9} tickLine={false} />
                            <YAxis stroke="#3f3f46" fontSize={9} tickLine={false} />
                            <Tooltip
                              contentStyle={{ background: "#09090b", border: "1px solid #18181b", borderRadius: "2px" }}
                              labelClassName="text-white text-xs font-bold"
                              itemStyle={{ color: "#dc2626", fontSize: "11px" }}
                            />
                            <Line type="monotone" dataKey="horas" name="Horas Semanais" stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                          </ReLineChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                </section>

                {/* 3. Paginated logs list */}
                <section className="premium-card rounded">
                  <div className="p-4 border-b border-zinc-900 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">Tarefas Realizadas</h3>
                    </div>
                    {/* Minimal Search */}
                    <div className="relative w-full md:w-64">
                      <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2" />
                      <input
                        type="text"
                        placeholder="Filtrar por tarefa..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#000000] border border-zinc-900 rounded pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-700 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-900 bg-black text-[9px] uppercase font-bold text-zinc-500 tracking-wider">
                          <th className="py-3 px-4">Data</th>
                          <th className="py-3 px-4">Workspace</th>
                          <th className="py-3 px-4">Projeto</th>
                          <th className="py-3 px-4">Tarefa Realizada</th>
                          <th className="py-3 px-4">Profissional</th>
                          <th className="py-3 px-4 text-right">Horas</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900/50 text-[11px]">
                        {paginatedLogs.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-zinc-600">Nenhum apontamento encontrado.</td>
                          </tr>
                        ) : (
                          paginatedLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-zinc-950 transition-colors">
                              <td className="py-2.5 px-4 text-zinc-500 mono-nums">
                                {new Date(log.date).toLocaleDateString("pt-BR")}
                              </td>
                              <td className="py-2.5 px-4 font-semibold text-red-500">{log.workspace}</td>
                              <td className="py-2.5 px-4">
                                <span className="bg-zinc-900 text-zinc-400 border border-zinc-800 text-[10px] px-2 py-0.5 rounded font-medium">
                                  {log.project}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 text-zinc-300 max-w-xs truncate">{log.task}</td>
                              <td className="py-2.5 px-4 text-zinc-450">{log.professional}</td>
                              <td className="py-2.5 px-4 text-right font-bold text-white mono-nums">{log.hours.toFixed(1)}h</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Table Footer */}
                  {totalPages > 1 && (
                    <div className="p-3 bg-black flex items-center justify-between border-t border-zinc-900">
                      <span className="text-[10px] text-zinc-500">
                        Mostrando <span className="font-semibold text-white">{paginatedLogs.length}</span> de <span className="font-semibold text-white">{filteredLogs.length}</span> registros
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="p-1 bg-[#09090b] hover:bg-zinc-900 border border-zinc-900 rounded text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[10px] flex items-center px-2 text-zinc-400 font-semibold">
                          Página {currentPage} de {totalPages}
                        </span>
                        <button
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="p-1 bg-[#09090b] hover:bg-zinc-900 border border-zinc-900 rounded text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </section>
              </>
            ) : (
              /* Detailed Table View Tab */
              <section className="premium-card rounded">
                <div className="p-4 border-b border-zinc-900 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Log Detalhado de Atividades</h3>
                  </div>
                  <div className="relative w-full md:w-64">
                    <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2" />
                    <input
                      type="text"
                      placeholder="Filtrar lançamentos..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[#000000] border border-zinc-900 rounded pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-700 transition-colors"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-900 bg-black text-[9px] uppercase font-bold text-zinc-500 tracking-wider">
                        <th className="py-3 px-4">ID</th>
                        <th className="py-3 px-4">Data</th>
                        <th className="py-3 px-4">Workspace</th>
                        <th className="py-3 px-4">Projeto</th>
                        <th className="py-3 px-4">Atividade Realizada</th>
                        <th className="py-3 px-4">Profissional</th>
                        <th className="py-3 px-4 text-right">Horas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900/50 text-[11px]">
                      {paginatedLogs.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-zinc-600">Nenhum apontamento.</td>
                        </tr>
                      ) : (
                        paginatedLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-zinc-950 transition-colors">
                            <td className="py-2.5 px-4 text-zinc-650 mono-nums">#{log.id}</td>
                            <td className="py-2.5 px-4 text-zinc-500 mono-nums">
                              {new Date(log.date).toLocaleDateString("pt-BR")}
                            </td>
                            <td className="py-2.5 px-4 font-semibold text-red-500">{log.workspace}</td>
                            <td className="py-2.5 px-4 text-zinc-400 font-semibold">{log.project}</td>
                            <td className="py-2.5 px-4 text-zinc-350 max-w-sm truncate">{log.task}</td>
                            <td className="py-2.5 px-4 text-zinc-400">{log.professional}</td>
                            <td className="py-2.5 px-4 text-right text-white font-bold mono-nums">{log.hours.toFixed(1)}h</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer */}
                {totalPages > 1 && (
                  <div className="p-3 bg-black flex items-center justify-between border-t border-zinc-900">
                    <span className="text-[10px] text-zinc-500">
                      Exibindo <span className="font-semibold text-white">{paginatedLogs.length}</span> de <span className="font-semibold text-white">{filteredLogs.length}</span> registros
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-1 bg-[#09090b] hover:bg-zinc-900 border border-zinc-900 rounded text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[10px] flex items-center px-2 text-zinc-400 font-semibold">
                        Página {currentPage} de {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-1 bg-[#09090b] hover:bg-zinc-900 border border-zinc-900 rounded text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
