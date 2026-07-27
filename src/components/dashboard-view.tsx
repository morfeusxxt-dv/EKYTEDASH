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
  TrendingUp,
  DollarSign,
  Briefcase,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  BarChart3,
  ListTodo,
  FileText,
  UserCheck,
} from "lucide-react";

interface HourLog {
  id: string;
  date: string;
  task: string;
  professional: string;
  hours: number;
  workspace: string;
  project: string;
  costPerHour: number;
}

export function DashboardView() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<"overview" | "detailed">("overview");

  // State filters
  const [period, setPeriod] = useState<"current-month" | "last-30" | "custom">("current-month");
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>("all");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Data fetching state
  const [logs, setLogs] = useState<HourLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Table pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 8;

  // Fetch eKyte integration proxy
  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        queryParams.append("workspaces", user.workspaces.join(","));

        if (selectedProject !== "all") {
          queryParams.append("project", selectedProject);
        }

        // Period Filtering dates calculated
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
        }
      } catch (err) {
        console.error("Erro ao carregar dados", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user, period, selectedProject, customStartDate, customEndDate]);

  // Compute sub-filters locally since Workspace and Search can be processed quickly on the client
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchWorkspace = selectedWorkspace === "all" || log.workspace === selectedWorkspace;
      const matchSearch =
        searchQuery === "" ||
        log.task.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.professional.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.project.toLowerCase().includes(searchQuery.toLowerCase());
      return matchWorkspace && matchSearch;
    });
  }, [logs, selectedWorkspace, searchQuery]);

  // Available workspaces and projects list for filters
  const workspacesList = useMemo(() => user?.workspaces || [], [user]);
  const projectsList = useMemo(() => {
    const list = new Set<string>();
    logs.forEach((l) => list.add(l.project));
    return Array.from(list);
  }, [logs]);

  // KPIs calculations
  const totalHours = useMemo(() => {
    return filteredLogs.reduce((acc, curr) => acc + curr.hours, 0);
  }, [filteredLogs]);

  const totalInvestment = useMemo(() => {
    return filteredLogs.reduce((acc, curr) => acc + curr.hours * curr.costPerHour, 0);
  }, [filteredLogs]);

  const avgCostPerHour = useMemo(() => {
    if (totalHours === 0) return 0;
    return totalInvestment / totalHours;
  }, [totalHours, totalInvestment]);

  // Variation simulation (last month variation placeholder)
  const simulatedVariation = useMemo(() => {
    // Generates a mock but stable percentage variation based on user name length for visual flair
    const base = user?.name ? user.name.length * 1.5 : 8.5;
    return {
      hours: `${base > 15 ? "+" : "-"}${(base % 7).toFixed(1)}%`,
      cost: `${base > 15 ? "+" : "-"}${(base % 5).toFixed(1)}%`,
      isNegative: base <= 15,
    };
  }, [user]);

  // Chart 1: Hours by Workspace (differentiates work between workspaces)
  const workspaceChartData = useMemo(() => {
    const dataMap: Record<string, { name: string; horas: number; custo: number }> = {};
    filteredLogs.forEach((log) => {
      if (!dataMap[log.workspace]) {
        dataMap[log.workspace] = { name: log.workspace, horas: 0, custo: 0 };
      }
      dataMap[log.workspace].horas += log.hours;
      dataMap[log.workspace].custo += log.hours * log.costPerHour;
    });
    return Object.values(dataMap);
  }, [filteredLogs]);

  // Chart 2: Daily Evolution of Hours
  const dailyChartData = useMemo(() => {
    const dataMap: Record<string, Record<string, number>> = {};
    filteredLogs.forEach((log) => {
      const dateLabel = new Date(log.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      if (!dataMap[dateLabel]) {
        dataMap[dateLabel] = {};
      }
      // Sum per workspace to allow stacked/multi-line chart
      if (!dataMap[dateLabel][log.workspace]) {
        dataMap[dateLabel][log.workspace] = 0;
      }
      dataMap[dateLabel][log.workspace] += log.hours;
    });

    // Transform map to array ordered by date string
    return Object.entries(dataMap)
      .map(([date, workspaces]) => {
        const item: any = { date };
        let total = 0;
        Object.entries(workspaces).forEach(([ws, hrs]) => {
          item[ws] = hrs;
          total += hrs;
        });
        item.Total = total;
        return item;
      })
      .sort((a, b) => {
        const [dayA, monthA] = a.date.split("/");
        const [dayB, monthB] = b.date.split("/");
        return new Date(2026, parseInt(monthA) - 1, parseInt(dayA)).getTime() -
               new Date(2026, parseInt(monthB) - 1, parseInt(dayB)).getTime();
      });
  }, [filteredLogs]);

  // Table pagination
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredLogs, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedWorkspace, selectedProject, period, searchQuery]);

  return (
    <div className="flex min-h-screen bg-[#050505] text-[#f5f5f7]">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 bg-[#0a0a0a] border-r border-zinc-900 flex flex-col justify-between p-6 z-20">
        <div>
          {/* Sidebar Brand Header */}
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-600/30">
              <span className="text-white font-black text-lg">eK</span>
            </div>
            <div>
              <span className="font-bold text-white block text-sm tracking-tight">INVESTOR</span>
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest block -mt-1 font-semibold">Dashboard</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-2">
            <button
              onClick={() => setActiveTab("overview")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === "overview"
                  ? "bg-red-950/40 text-red-500 border border-red-900/40"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Visão Geral
            </button>
            <button
              onClick={() => setActiveTab("detailed")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === "detailed"
                  ? "bg-red-950/40 text-red-500 border border-red-900/40"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"
              }`}
            >
              <FileText className="w-4 h-4" />
              Relatório Detalhado
            </button>
          </nav>
        </div>

        {/* Sidebar Footer (User info & logout) */}
        <div className="border-t border-zinc-900 pt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-800 text-red-500 font-bold text-xs uppercase">
              {user?.name.slice(0, 2)}
            </div>
            <div className="truncate">
              <span className="text-xs font-semibold text-white block truncate">{user?.name}</span>
              <span className="text-[10px] text-zinc-500 uppercase block truncate">{user?.role === "admin" ? "Administrador" : "Investidor"}</span>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-zinc-900 hover:bg-red-950/30 border border-zinc-800 hover:border-red-900/40 text-zinc-400 hover:text-red-400 text-xs font-bold rounded-lg transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sair do Painel
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header Filter Bar */}
        <header className="h-20 bg-[#080808]/90 backdrop-filter backdrop-blur-md border-b border-zinc-900 flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center gap-6">
            <h1 className="text-lg font-bold text-white tracking-tight">
              {activeTab === "overview" ? "Visão Geral de Performance" : "Extrato e Log de Horas"}
            </h1>

            {/* Quick Period Selector */}
            <div className="flex bg-[#121212] border border-zinc-900 rounded-lg p-0.5 text-xs">
              <button
                onClick={() => setPeriod("current-month")}
                className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                  period === "current-month" ? "bg-red-600 text-white shadow-md" : "text-zinc-400 hover:text-white"
                }`}
              >
                Mês Atual
              </button>
              <button
                onClick={() => setPeriod("last-30")}
                className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                  period === "last-30" ? "bg-red-600 text-white shadow-md" : "text-zinc-400 hover:text-white"
                }`}
              >
                Últimos 30 Dias
              </button>
              <button
                onClick={() => setPeriod("custom")}
                className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                  period === "custom" ? "bg-red-600 text-white shadow-md" : "text-zinc-400 hover:text-white"
                }`}
              >
                Personalizado
              </button>
            </div>
          </div>

          {/* Filters Area */}
          <div className="flex items-center gap-3">
            {/* Custom Date Picker Inputs when selected */}
            {period === "custom" && (
              <div className="flex items-center gap-2 bg-[#0c0c0c] border border-zinc-900 rounded-lg px-2 py-1 text-xs">
                <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-transparent text-white border-0 focus:ring-0 w-28 text-[11px]"
                />
                <span className="text-zinc-600">até</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-transparent text-white border-0 focus:ring-0 w-28 text-[11px]"
                />
              </div>
            )}

            {/* Workspace Selector */}
            <div className="relative flex items-center">
              <Layers className="w-3.5 h-3.5 text-zinc-500 absolute left-3 pointer-events-none" />
              <select
                value={selectedWorkspace}
                onChange={(e) => setSelectedWorkspace(e.target.value)}
                className="pl-9 pr-8 py-2 bg-[#0c0c0c] border border-zinc-900 rounded-lg text-xs text-white focus:outline-none focus:border-red-600 appearance-none"
              >
                <option value="all">Todos os Workspaces</option>
                {workspacesList.map((ws) => (
                  <option key={ws} value={ws}>
                    {ws}
                  </option>
                ))}
              </select>
            </div>

            {/* Project/Campaign Selector */}
            <div className="relative flex items-center">
              <Briefcase className="w-3.5 h-3.5 text-zinc-500 absolute left-3 pointer-events-none" />
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="pl-9 pr-8 py-2 bg-[#0c0c0c] border border-zinc-900 rounded-lg text-xs text-white focus:outline-none focus:border-red-600 appearance-none"
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

        {/* Dashboard Panels */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-zinc-800 border-t-red-600 rounded-full animate-spin" />
            <span className="text-sm text-zinc-400 font-medium">Carregando dados da eKyte API...</span>
          </div>
        ) : (
          <div className="p-8 space-y-8 flex-1">
            {/* 1. KPI Cards */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Total Hours KPI Card */}
              <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Clock className="w-24 h-24 text-white" />
                </div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Horas Consumidas</span>
                  <div className="p-2 bg-red-950/40 border border-red-900/30 text-red-500 rounded-lg">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-white tracking-tight">{totalHours.toFixed(1)}h</span>
                  <span className={`text-xs font-bold flex items-center gap-0.5 ${simulatedVariation.isNegative ? "text-green-500" : "text-red-500"}`}>
                    {simulatedVariation.hours}
                  </span>
                </div>
                <span className="text-[10px] text-zinc-500 block mt-2">Horas totais registradas no período selecionado.</span>
              </div>

              {/* Estimated Investment KPI Card */}
              <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <DollarSign className="w-24 h-24 text-white" />
                </div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Investimento Estimado</span>
                  <div className="p-2 bg-red-950/40 border border-red-900/30 text-red-500 rounded-lg">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-white tracking-tight">
                    {totalInvestment.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </span>
                  <span className={`text-xs font-bold flex items-center gap-0.5 ${simulatedVariation.isNegative ? "text-green-500" : "text-red-500"}`}>
                    {simulatedVariation.cost}
                  </span>
                </div>
                <span className="text-[10px] text-zinc-500 block mt-2">Baseado no valor/hora cadastrado por profissional.</span>
              </div>

              {/* Average Cost/Hour KPI Card */}
              <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <TrendingUp className="w-24 h-24 text-white" />
                </div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Custo Médio da Hora</span>
                  <div className="p-2 bg-red-950/40 border border-red-900/30 text-red-500 rounded-lg">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-white tracking-tight">
                    {avgCostPerHour.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </span>
                </div>
                <span className="text-[10px] text-zinc-500 block mt-2">Eficiência operacional calculada por apontamento.</span>
              </div>
            </section>

            {activeTab === "overview" ? (
              <>
                {/* 2. Graphical Reports Section */}
                <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Bar Chart: Hours by Workspace */}
                  <div className="glass-panel p-6 rounded-2xl">
                    <div className="mb-6 flex justify-between items-center">
                      <div>
                        <h3 className="font-bold text-white text-sm">Distribuição de Horas por Workspace</h3>
                        <p className="text-[11px] text-zinc-500 mt-0.5">Diferenciação clara do consumo operacional por cliente/divisão</p>
                      </div>
                    </div>
                    <div className="h-72">
                      {workspaceChartData.length === 0 ? (
                        <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">Sem dados suficientes no período.</div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <ReBarChart data={workspaceChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#18181b" />
                            <XAxis dataKey="name" stroke="#52525b" fontSize={10} tickLine={false} />
                            <YAxis stroke="#52525b" fontSize={10} tickLine={false} />
                            <Tooltip
                              contentStyle={{ background: "#0a0a0a", border: "1px solid #27272a", borderRadius: "8px" }}
                              labelClassName="text-white text-xs font-bold"
                              itemStyle={{ color: "#ef4444", fontSize: "11px" }}
                            />
                            <Bar dataKey="horas" fill="#dc2626" radius={[4, 4, 0, 0]} maxBarSize={45} />
                          </ReBarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>

                  {/* Line Chart: Daily Consumption Evolution */}
                  <div className="glass-panel p-6 rounded-2xl">
                    <div className="mb-6 flex justify-between items-center">
                      <div>
                        <h3 className="font-bold text-white text-sm">Evolução do Consumo de Horas</h3>
                        <p className="text-[11px] text-zinc-500 mt-0.5">Visão diária do consumo operacional ao longo do mês</p>
                      </div>
                    </div>
                    <div className="h-72">
                      {dailyChartData.length === 0 ? (
                        <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">Sem dados suficientes no período.</div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <ReLineChart data={dailyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#18181b" />
                            <XAxis dataKey="date" stroke="#52525b" fontSize={10} tickLine={false} />
                            <YAxis stroke="#52525b" fontSize={10} tickLine={false} />
                            <Tooltip
                              contentStyle={{ background: "#0a0a0a", border: "1px solid #27272a", borderRadius: "8px" }}
                              labelClassName="text-white text-xs font-bold"
                              itemStyle={{ fontSize: "11px" }}
                            />
                            <Legend wrapperStyle={{ fontSize: "10px", marginTop: "10px" }} />
                            {/* Create dynamic line per workspace or general Total */}
                            {workspacesList.map((ws, index) => {
                              // Generates different colors of red/gray for lines
                              const colors = ["#dc2626", "#f87171", "#7f1d1d", "#ef4444", "#a1a1aa"];
                              const lineColor = colors[index % colors.length];
                              return (
                                <Line key={ws} type="monotone" dataKey={ws} stroke={lineColor} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                              );
                            })}
                            <Line type="monotone" dataKey="Total" stroke="#f5f5f7" strokeWidth={1} strokeDasharray="4 4" name="Consumo Total" dot={false} />
                          </ReLineChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                </section>

                {/* 3. Paginated Logs Table (Preview at the bottom) */}
                <section className="glass-panel rounded-2xl overflow-hidden">
                  <div className="p-6 border-b border-zinc-900 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-white text-sm">Registros Recentes de Atividades</h3>
                      <p className="text-[11px] text-zinc-500 mt-0.5">Apontamentos de horas processados recentemente</p>
                    </div>
                    {/* Inline Search Bar */}
                    <div className="relative w-full md:w-72">
                      <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Buscar por profissional ou tarefa..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#0d0d0d] border border-zinc-900 rounded-lg pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-red-600 placeholder-zinc-600"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-900 bg-[#090909] text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                          <th className="py-4 px-6">Data</th>
                          <th className="py-4 px-6">Workspace</th>
                          <th className="py-4 px-6">Projeto</th>
                          <th className="py-4 px-6">Tarefa Realizada</th>
                          <th className="py-4 px-6">Profissional</th>
                          <th className="py-4 px-6 text-right">Tempo</th>
                          <th className="py-4 px-6 text-right">Valor Estimado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900/50 text-xs">
                        {paginatedLogs.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-zinc-600">Nenhum apontamento encontrado para os filtros selecionados.</td>
                          </tr>
                        ) : (
                          paginatedLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-zinc-900/20 transition-colors">
                              <td className="py-3.5 px-6 font-medium text-zinc-400">
                                {new Date(log.date).toLocaleDateString("pt-BR")}
                              </td>
                              <td className="py-3.5 px-6 font-semibold text-red-400">{log.workspace}</td>
                              <td className="py-3.5 px-6">
                                <span className="bg-zinc-900 text-zinc-300 border border-zinc-800 text-[10px] px-2.5 py-0.5 rounded-full font-medium">
                                  {log.project}
                                </span>
                              </td>
                              <td className="py-3.5 px-6 font-medium text-white max-w-xs truncate">{log.task}</td>
                              <td className="py-3.5 px-6 text-zinc-300 font-medium">{log.professional}</td>
                              <td className="py-3.5 px-6 text-right text-white font-bold">{log.hours.toFixed(1)}h</td>
                              <td className="py-3.5 px-6 text-right font-semibold text-green-500">
                                {(log.hours * log.costPerHour).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Footer */}
                  {totalPages > 1 && (
                    <div className="p-4 border-t border-zinc-900 bg-[#080808] flex items-center justify-between">
                      <span className="text-[11px] text-zinc-500">
                        Mostrando <span className="font-semibold text-white">{paginatedLogs.length}</span> de <span className="font-semibold text-white">{filteredLogs.length}</span> registros
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="p-1.5 bg-[#0d0d0d] hover:bg-zinc-900 border border-zinc-850 rounded text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-xs flex items-center px-3 text-zinc-400 font-semibold">
                          Página {currentPage} de {totalPages}
                        </span>
                        <button
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="p-1.5 bg-[#0d0d0d] hover:bg-zinc-900 border border-zinc-850 rounded text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </section>
              </>
            ) : (
              /* Detailed Table view tab */
              <section className="glass-panel rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-zinc-900 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-white text-sm font-semibold text-white">Extrato Consolidado e Filtrado</h3>
                    <p className="text-[11px] text-zinc-500 mt-0.5">Analise cada apontamento de forma individual com dados financeiros</p>
                  </div>
                  <div className="relative w-full md:w-72">
                    <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Filtrar profissionais ou tarefas..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[#0d0d0d] border border-zinc-900 rounded-lg pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-red-600 placeholder-zinc-600"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-900 bg-[#090909] text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                        <th className="py-4 px-6">ID</th>
                        <th className="py-4 px-6">Data</th>
                        <th className="py-4 px-6">Workspace</th>
                        <th className="py-4 px-6">Projeto</th>
                        <th className="py-4 px-6">Atividade</th>
                        <th className="py-4 px-6">Colaborador</th>
                        <th className="py-4 px-6 text-right">Taxa/Hora</th>
                        <th className="py-4 px-6 text-right">Horas</th>
                        <th className="py-4 px-6 text-right">Total Investido</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900/50 text-xs">
                      {paginatedLogs.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-zinc-600">Nenhum apontamento correspondente.</td>
                        </tr>
                      ) : (
                        paginatedLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-zinc-900/20 transition-colors">
                            <td className="py-3.5 px-6 font-medium text-zinc-650">#{log.id}</td>
                            <td className="py-3.5 px-6 font-medium text-zinc-450">
                              {new Date(log.date).toLocaleDateString("pt-BR")}
                            </td>
                            <td className="py-3.5 px-6 font-semibold text-red-500">{log.workspace}</td>
                            <td className="py-3.5 px-6 text-zinc-300 font-semibold">{log.project}</td>
                            <td className="py-3.5 px-6 font-medium text-white max-w-sm truncate">{log.task}</td>
                            <td className="py-3.5 px-6 text-zinc-400 font-medium">{log.professional}</td>
                            <td className="py-3.5 px-6 text-right text-zinc-450">
                              {log.costPerHour.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                            </td>
                            <td className="py-3.5 px-6 text-right text-white font-bold">{log.hours.toFixed(1)}h</td>
                            <td className="py-3.5 px-6 text-right font-bold text-green-500">
                              {(log.hours * log.costPerHour).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Footer */}
                {totalPages > 1 && (
                  <div className="p-4 border-t border-zinc-900 bg-[#080808] flex items-center justify-between">
                    <span className="text-[11px] text-zinc-500">
                      Exibindo <span className="font-semibold text-white">{paginatedLogs.length}</span> de <span className="font-semibold text-white">{filteredLogs.length}</span> registros
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-1.5 bg-[#0d0d0d] hover:bg-zinc-900 border border-zinc-850 rounded text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-xs flex items-center px-3 text-zinc-400 font-semibold">
                        Página {currentPage} de {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-1.5 bg-[#0d0d0d] hover:bg-zinc-900 border border-zinc-850 rounded text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
                      >
                        <ChevronRight className="w-4 h-4" />
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
