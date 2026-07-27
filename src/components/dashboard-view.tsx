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
  PieChart,
  Pie,
  Cell,
  Treemap,
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
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Activity,
  ChevronDown,
  Users,
  Timer,
  FolderKanban,
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

interface UserInfo {
  id: string;
  email: string;
  name: string;
}

const PIE_COLORS = ["#dc2626", "#b91c1c", "#ef4444", "#f87171", "#fca5a5", "#991b1b", "#7f1d1d", "#450a0a"];

function formatHours(h: number): string {
  if (h >= 1000) return `${(h / 1000).toFixed(1)}k`;
  return `${h.toFixed(1)}`;
}

export function DashboardView() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<"overview" | "workspaces" | "detailed">("overview");

  // Filtros
  const [period, setPeriod] = useState<"current-month" | "last-30" | "custom">("current-month");
  const [selectedInvestor, setSelectedInvestor] = useState<string>("all");
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>("all");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Dados
  const [allUsers, setAllUsers] = useState<UserInfo[]>([]);
  const [logs, setLogs] = useState<HourLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Paginação
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 12;

  // Carrega usuários do eKyte
  useEffect(() => {
    async function loadUsers() {
      try {
        const response = await fetch("/api/users");
        if (response.ok) {
          const resJson = await response.json();
          setAllUsers(resJson.data || []);
        }
      } catch (err) {
        console.error("Erro ao carregar usuários", err);
      }
    }
    loadUsers();
  }, []);

  // Carrega apontamentos
  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      setLoading(true);
      setError(null);
      try {
        const queryParams = new URLSearchParams();
        queryParams.append("workspaces", user.workspaces.join(","));

        if (selectedInvestor !== "all") {
          const matchedUser = allUsers.find(u => u.email === selectedInvestor);
          if (matchedUser?.id) queryParams.append("executorId", matchedUser.id);
          queryParams.append("professional", selectedInvestor);
        }

        if (selectedProject !== "all") queryParams.append("project", selectedProject);

        let start = "";
        let end = "";
        const now = new Date();

        if (period === "current-month") {
          start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
          end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
        } else if (period === "last-30") {
          const d = new Date();
          d.setDate(now.getDate() - 30);
          start = d.toISOString().split("T")[0];
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
          setError(errData.error || `Erro ${response.status}`);
          setLogs([]);
        }
      } catch (err: any) {
        setError(err.message || "Erro de rede");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user, period, selectedProject, customStartDate, customEndDate, selectedInvestor, allUsers]);

  // Filtros locais
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchInvestor = selectedInvestor === "all" || log.professional === selectedInvestor;
      const matchWorkspace = selectedWorkspace === "all" || log.workspace === selectedWorkspace;
      const matchSearch =
        searchQuery === "" ||
        log.task.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.workspace.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.professional.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.project.toLowerCase().includes(searchQuery.toLowerCase());
      return matchInvestor && matchWorkspace && matchSearch;
    });
  }, [logs, selectedInvestor, selectedWorkspace, searchQuery]);

  // Listas dinâmicas
  const workspacesList = useMemo(() => {
    const set = new Set<string>();
    (selectedInvestor === "all" ? logs : logs.filter(l => l.professional === selectedInvestor))
      .forEach(l => set.add(l.workspace));
    return Array.from(set).sort();
  }, [logs, selectedInvestor]);

  const projectsList = useMemo(() => {
    const set = new Set<string>();
    logs.forEach(l => set.add(l.project));
    return Array.from(set).sort();
  }, [logs]);

  // KPIs
  const totalHours = useMemo(() => filteredLogs.reduce((a, c) => a + c.hours, 0), [filteredLogs]);
  const uniqueWorkspaces = useMemo(() => new Set(filteredLogs.map(l => l.workspace)).size, [filteredLogs]);
  const uniqueProfessionals = useMemo(() => new Set(filteredLogs.map(l => l.professional)).size, [filteredLogs]);
  const uniqueProjects = useMemo(() => new Set(filteredLogs.map(l => l.project)).size, [filteredLogs]);
  const totalLogs = filteredLogs.length;

  // Ranking de Workspaces por horas
  const workspaceRanking = useMemo(() => {
    const map: Record<string, { name: string; hours: number; logs: number; professionals: Set<string> }> = {};
    filteredLogs.forEach(log => {
      if (!map[log.workspace]) {
        map[log.workspace] = { name: log.workspace, hours: 0, logs: 0, professionals: new Set() };
      }
      map[log.workspace].hours += log.hours;
      map[log.workspace].logs += 1;
      map[log.workspace].professionals.add(log.professional);
    });
    return Object.values(map)
      .map(ws => ({ ...ws, professionals: ws.professionals.size }))
      .sort((a, b) => b.hours - a.hours);
  }, [filteredLogs]);

  const maxWsHours = workspaceRanking[0]?.hours || 1;

  // Ranking de Profissionais por horas
  const professionalRanking = useMemo(() => {
    const map: Record<string, { name: string; hours: number; logs: number; workspaces: Set<string> }> = {};
    filteredLogs.forEach(log => {
      const key = log.professional;
      if (!map[key]) map[key] = { name: key, hours: 0, logs: 0, workspaces: new Set() };
      map[key].hours += log.hours;
      map[key].logs += 1;
      map[key].workspaces.add(log.workspace);
    });
    return Object.values(map)
      .map(p => ({ ...p, workspaces: p.workspaces.size }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 10);
  }, [filteredLogs]);

  // Gráfico semanal
  const weeklyChartData = useMemo(() => {
    const weeksMap: Record<string, number> = { "Sem 1": 0, "Sem 2": 0, "Sem 3": 0, "Sem 4": 0 };
    filteredLogs.forEach(log => {
      const day = new Date(log.date).getDate();
      if (day <= 7) weeksMap["Sem 1"] += log.hours;
      else if (day <= 14) weeksMap["Sem 2"] += log.hours;
      else if (day <= 21) weeksMap["Sem 3"] += log.hours;
      else weeksMap["Sem 4"] += log.hours;
    });
    return Object.entries(weeksMap).map(([name, horas]) => ({ name, horas: parseFloat(horas.toFixed(1)) }));
  }, [filteredLogs]);

  // Pie por tipo de projeto
  const projectPieData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredLogs.forEach(log => {
      map[log.project] = (map[log.project] || 0) + log.hours;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(1)) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [filteredLogs]);

  // Paginação
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(start, start + itemsPerPage);
  }, [filteredLogs, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [selectedInvestor, selectedWorkspace, selectedProject, period, searchQuery]);

  return (
    <div className="flex min-h-screen" style={{ background: "#000000", color: "#f4f4f5" }}>
      
      {/* ─── SIDEBAR ─── */}
      <aside className="w-52 shrink-0 flex flex-col justify-between py-5 px-3 z-20 border-r" style={{ background: "var(--sidebar-bg)", borderColor: "var(--border)" }}>
        <div>
          {/* Logo */}
          <div className="flex items-center gap-2 mb-7 px-2">
            <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: "#dc2626" }}>
              <span className="text-white font-black text-xs">eK</span>
            </div>
            <span className="text-[11px] font-bold tracking-wider uppercase text-white">eKyte<span className="font-normal" style={{ color: "var(--text-muted)" }}> Dash</span></span>
          </div>

          {/* Nav */}
          <nav className="space-y-0.5">
            <button onClick={() => setActiveTab("overview")} className={`nav-item ${activeTab === "overview" ? "active" : ""}`}>
              <BarChart3 className="w-3.5 h-3.5 shrink-0" />
              Visão Geral
            </button>
            <button onClick={() => setActiveTab("workspaces")} className={`nav-item ${activeTab === "workspaces" ? "active" : ""}`}>
              <Layers className="w-3.5 h-3.5 shrink-0" />
              Workspaces
            </button>
            <button onClick={() => setActiveTab("detailed")} className={`nav-item ${activeTab === "detailed" ? "active" : ""}`}>
              <FileText className="w-3.5 h-3.5 shrink-0" />
              Log de Horas
            </button>
          </nav>

          {/* Divider */}
          <div className="my-5 border-t" style={{ borderColor: "var(--border)" }} />

          {/* Stats quick view */}
          <div className="px-2 space-y-3">
            <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Resumo</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Total horas</span>
                <span className="text-[11px] font-bold text-white mono-nums">{formatHours(totalHours)}h</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Workspaces</span>
                <span className="text-[11px] font-bold text-white mono-nums">{uniqueWorkspaces}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Profissionais</span>
                <span className="text-[11px] font-bold text-white mono-nums">{uniqueProfessionals}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Apontamentos</span>
                <span className="text-[11px] font-bold text-white mono-nums">{totalLogs}</span>
              </div>
            </div>
          </div>
        </div>

        {/* User footer */}
        <div>
          <div className="border-t mb-3" style={{ borderColor: "var(--border)" }} />
          <div className="px-2">
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold uppercase border" style={{ background: "rgba(220,38,38,0.08)", borderColor: "rgba(220,38,38,0.2)", color: "#f87171" }}>
                {user?.name?.slice(0, 2) || "?"}
              </div>
              <div className="truncate">
                <p className="text-[10px] font-semibold text-white truncate">{user?.name}</p>
                <p className="text-[9px]" style={{ color: "var(--text-muted)" }}>Gestor</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded text-[10px] font-semibold transition-colors"
              style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)" }}
              onMouseEnter={e => { (e.target as HTMLElement).style.color = "#f87171"; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.color = "var(--text-muted)"; }}
            >
              <LogOut className="w-3 h-3" />
              Sair
            </button>
          </div>
        </div>
      </aside>

      {/* ─── MAIN ─── */}
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">

        {/* ── TOPBAR ── */}
        <header className="h-14 flex items-center justify-between px-5 shrink-0 border-b" style={{ background: "#000", borderColor: "var(--border)" }}>
          <div className="flex items-center gap-3">
            {/* Period selector */}
            <div className="flex rounded overflow-hidden border text-[10px]" style={{ borderColor: "var(--border)" }}>
              {(["current-month", "last-30", "custom"] as const).map((p, i) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className="px-3 py-1.5 font-medium transition-colors"
                  style={{
                    background: period === p ? "#111113" : "transparent",
                    color: period === p ? "#fff" : "var(--text-muted)",
                    borderLeft: i > 0 ? "1px solid var(--border)" : "none"
                  }}
                >
                  {p === "current-month" ? "Mês Atual" : p === "last-30" ? "30 Dias" : "Período"}
                </button>
              ))}
            </div>
            {period === "custom" && (
              <div className="flex items-center gap-1.5 rounded border px-2 py-1 text-[10px]" style={{ borderColor: "var(--border)" }}>
                <Calendar className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
                <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} className="bg-transparent text-white border-0 w-24 text-[10px]" />
                <span style={{ color: "var(--text-muted)" }}>–</span>
                <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} className="bg-transparent text-white border-0 w-24 text-[10px]" />
              </div>
            )}
          </div>

          {/* Right filters */}
          <div className="flex items-center gap-2">
            {/* Professional */}
            <div className="relative flex items-center">
              <User className="w-3 h-3 absolute left-2 pointer-events-none" style={{ color: "var(--text-muted)" }} />
              <select
                value={selectedInvestor}
                onChange={e => setSelectedInvestor(e.target.value)}
                className="pl-6 pr-6 py-1.5 rounded border text-[10px] font-semibold appearance-none cursor-pointer"
                style={{ background: "#050507", borderColor: "var(--border)", color: selectedInvestor !== "all" ? "#f87171" : "var(--text-muted)" }}
              >
                <option value="all">Todos os Profissionais</option>
                {allUsers.map(u => (
                  <option key={u.email} value={u.email}>{u.name} ({u.email})</option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 absolute right-1.5 pointer-events-none" style={{ color: "var(--text-muted)" }} />
            </div>

            {/* Workspace */}
            <div className="relative flex items-center">
              <Layers className="w-3 h-3 absolute left-2 pointer-events-none" style={{ color: "var(--text-muted)" }} />
              <select
                value={selectedWorkspace}
                onChange={e => setSelectedWorkspace(e.target.value)}
                className="pl-6 pr-6 py-1.5 rounded border text-[10px] font-medium appearance-none cursor-pointer"
                style={{ background: "#050507", borderColor: "var(--border)", color: selectedWorkspace !== "all" ? "#fff" : "var(--text-muted)" }}
              >
                <option value="all">Todos os Workspaces</option>
                {workspacesList.map(ws => <option key={ws} value={ws}>{ws}</option>)}
              </select>
              <ChevronDown className="w-3 h-3 absolute right-1.5 pointer-events-none" style={{ color: "var(--text-muted)" }} />
            </div>

            {/* Project */}
            <div className="relative flex items-center">
              <FolderKanban className="w-3 h-3 absolute left-2 pointer-events-none" style={{ color: "var(--text-muted)" }} />
              <select
                value={selectedProject}
                onChange={e => setSelectedProject(e.target.value)}
                className="pl-6 pr-6 py-1.5 rounded border text-[10px] font-medium appearance-none cursor-pointer"
                style={{ background: "#050507", borderColor: "var(--border)", color: selectedProject !== "all" ? "#fff" : "var(--text-muted)" }}
              >
                <option value="all">Todos os Projetos</option>
                {projectsList.map(pj => <option key={pj} value={pj}>{pj}</option>)}
              </select>
              <ChevronDown className="w-3 h-3 absolute right-1.5 pointer-events-none" style={{ color: "var(--text-muted)" }} />
            </div>
          </div>
        </header>

        {/* ── PAGE CONTENT ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          
          {loading ? (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 spin-loader" style={{ borderColor: "var(--border)", borderTopColor: "#dc2626" }} />
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Consultando API eKyte...</p>
            </div>
          ) : error ? (
            <div className="min-h-[400px] flex flex-col items-center justify-center gap-4 max-w-md mx-auto text-center">
              <div className="p-3 rounded border" style={{ borderColor: "rgba(220,38,38,0.2)", background: "rgba(220,38,38,0.05)" }}>
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-xs font-bold text-white mb-1">Conexão com eKyte</p>
                <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{error}</p>
              </div>
              <div className="text-[10px] rounded border p-3 w-full text-left" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                Verifique as variáveis de ambiente <strong className="text-white">EKYTE_API_TOKEN</strong> e <strong className="text-white">EKYTE_COMPANY_ID</strong> na Vercel e faça um Redeploy.
              </div>
            </div>
          ) : (
            <>

              {/* ─── KPI STRIP ─── */}
              <div className="grid grid-cols-5 gap-3">
                {[
                  { label: "Horas Totais", value: `${formatHours(totalHours)}h`, icon: <Clock className="w-3.5 h-3.5" />, mono: true },
                  { label: "Workspaces", value: String(uniqueWorkspaces), icon: <Layers className="w-3.5 h-3.5" />, mono: true },
                  { label: "Profissionais", value: String(uniqueProfessionals), icon: <Users className="w-3.5 h-3.5" />, mono: true },
                  { label: "Projetos", value: String(uniqueProjects), icon: <Briefcase className="w-3.5 h-3.5" />, mono: true },
                  { label: "Apontamentos", value: String(totalLogs), icon: <Activity className="w-3.5 h-3.5" />, mono: true },
                ].map((kpi, i) => (
                  <div key={i} className="kpi-card rounded-md p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{kpi.label}</span>
                      <span style={{ color: "var(--text-muted)" }}>{kpi.icon}</span>
                    </div>
                    <p className={`text-xl font-extrabold text-white ${kpi.mono ? "mono-nums" : ""}`}>{kpi.value}</p>
                  </div>
                ))}
              </div>

              {/* ─── OVERVIEW TAB ─── */}
              {activeTab === "overview" && (
                <>
                  {/* Charts row */}
                  <div className="grid grid-cols-5 gap-4">
                    {/* Weekly bar */}
                    <div className="col-span-3 premium-card rounded-md p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-4" style={{ color: "var(--text-muted)" }}>Evolução Semanal — Horas</p>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <ReBarChart data={weeklyChartData} margin={{ top: 5, right: 0, left: -30, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="2 4" stroke="#0d0d0f" vertical={false} />
                            <XAxis dataKey="name" stroke="#27272a" fontSize={9} tickLine={false} axisLine={false} />
                            <YAxis stroke="#27272a" fontSize={9} tickLine={false} axisLine={false} />
                            <Tooltip
                              contentStyle={{ background: "#08080a", border: "1px solid #1a1a1d", borderRadius: "4px", fontSize: "11px" }}
                              itemStyle={{ color: "#f87171" }}
                              labelStyle={{ color: "#fff", fontWeight: "bold" }}
                              formatter={(val: any) => [`${val}h`, "Horas"]}
                            />
                            <Bar dataKey="horas" fill="#dc2626" radius={[2, 2, 0, 0]} maxBarSize={36} />
                          </ReBarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Pie chart - project types */}
                    <div className="col-span-2 premium-card rounded-md p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-4" style={{ color: "var(--text-muted)" }}>Distribuição por Projeto</p>
                      {projectPieData.length === 0 ? (
                        <div className="h-48 flex items-center justify-center text-xs" style={{ color: "var(--text-muted)" }}>Sem dados</div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div style={{ width: 140, height: 140 }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie data={projectPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={36} outerRadius={62} strokeWidth={0}>
                                  {projectPieData.map((_, index) => (
                                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip
                                  contentStyle={{ background: "#08080a", border: "1px solid #1a1a1d", borderRadius: "4px", fontSize: "11px" }}
                                  itemStyle={{ color: "#f87171" }}
                                  formatter={(val: any) => [`${val}h`, ""]}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="flex-1 space-y-1.5 min-w-0">
                            {projectPieData.slice(0, 5).map((p, i) => (
                              <div key={i} className="flex items-center gap-1.5 min-w-0">
                                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                                <span className="text-[9px] truncate" style={{ color: "#a1a1aa" }} title={p.name}>{p.name}</span>
                                <span className="text-[9px] font-bold text-white ml-auto mono-nums shrink-0">{p.value}h</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Top 5 workspace ranking */}
                  <div className="premium-card rounded-md p-4">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Top Workspaces por Horas</p>
                      <button
                        onClick={() => setActiveTab("workspaces")}
                        className="text-[9px] font-semibold px-2 py-0.5 rounded"
                        style={{ color: "#f87171", background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.15)" }}
                      >
                        Ver todos →
                      </button>
                    </div>
                    <div className="space-y-2.5">
                      {workspaceRanking.slice(0, 5).map((ws, i) => (
                        <div key={ws.name} className="flex items-center gap-3">
                          <span className="text-[9px] font-bold mono-nums w-4 shrink-0 text-right" style={{ color: i === 0 ? "#dc2626" : "var(--text-muted)" }}>
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-medium text-white truncate" title={ws.name}>{ws.name}</span>
                              <span className="text-[10px] font-bold text-white mono-nums ml-2 shrink-0">{ws.hours.toFixed(1)}h</span>
                            </div>
                            <div className="progress-bar">
                              <div className="progress-fill" style={{ width: `${(ws.hours / maxWsHours) * 100}%` }} />
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="badge-idle text-[9px] px-1.5 py-0.5 rounded font-medium">{ws.professionals} prof.</span>
                            <span className="badge-idle text-[9px] px-1.5 py-0.5 rounded font-medium mono-nums">{ws.logs} apont.</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top Profissionais */}
                  <div className="premium-card rounded-md overflow-hidden">
                    <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
                      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Ranking de Profissionais</p>
                    </div>
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b" style={{ borderColor: "var(--border-subtle)" }}>
                          {["#", "Profissional", "Workspaces", "Apontamentos", "Horas"].map((h, i) => (
                            <th key={i} className={`py-2.5 px-4 text-[9px] font-bold uppercase tracking-wider ${i === 4 ? "text-right" : "text-left"}`} style={{ color: "var(--text-muted)", background: "#03030a" }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {professionalRanking.map((p, i) => (
                          <tr key={p.name} className="table-row-hover border-b" style={{ borderColor: "var(--border-subtle)" }}>
                            <td className="py-2.5 px-4 text-[10px] font-bold mono-nums" style={{ color: i === 0 ? "#dc2626" : "var(--text-muted)" }}>{i + 1}</td>
                            <td className="py-2.5 px-4 text-[11px] text-white font-medium">{p.name}</td>
                            <td className="py-2.5 px-4">
                              <span className="badge-idle text-[9px] px-1.5 py-0.5 rounded font-medium">{p.workspaces} ws</span>
                            </td>
                            <td className="py-2.5 px-4 text-[10px] mono-nums" style={{ color: "var(--text-muted)" }}>{p.logs}</td>
                            <td className="py-2.5 px-4 text-right text-[11px] font-bold text-white mono-nums">{p.hours.toFixed(1)}h</td>
                          </tr>
                        ))}
                        {professionalRanking.length === 0 && (
                          <tr><td colSpan={5} className="py-8 text-center text-xs" style={{ color: "var(--text-muted)" }}>Nenhum dado</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* ─── WORKSPACES TAB ─── */}
              {activeTab === "workspaces" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-white">{workspaceRanking.length} workspaces com apontamentos</p>
                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Ordenado por horas decrescentes</p>
                  </div>
                  <div className="premium-card rounded-md overflow-hidden">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b" style={{ borderColor: "var(--border-subtle)" }}>
                          {["#", "Workspace", "Profissionais", "Apontamentos", "Distribuição", "Total Horas"].map((h, i) => (
                            <th key={i} className={`py-3 px-4 text-[9px] font-bold uppercase tracking-wider ${i >= 4 ? "text-right" : "text-left"}`} style={{ color: "var(--text-muted)", background: "#03030a" }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {workspaceRanking.map((ws, i) => (
                          <tr key={ws.name} className="table-row-hover border-b" style={{ borderColor: "var(--border-subtle)" }}>
                            <td className="py-3 px-4 text-[10px] font-bold mono-nums" style={{ color: i === 0 ? "#dc2626" : "var(--text-muted)" }}>{i + 1}</td>
                            <td className="py-3 px-4">
                              <span className="text-[11px] font-medium text-white">{ws.name}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="badge-idle text-[9px] px-1.5 py-0.5 rounded font-medium">{ws.professionals} prof.</span>
                            </td>
                            <td className="py-3 px-4 text-[10px] mono-nums" style={{ color: "var(--text-muted)" }}>{ws.logs} apont.</td>
                            <td className="py-3 px-4 w-32">
                              <div className="progress-bar">
                                <div className="progress-fill" style={{ width: `${(ws.hours / maxWsHours) * 100}%` }} />
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right text-[12px] font-bold text-white mono-nums">{ws.hours.toFixed(1)}h</td>
                          </tr>
                        ))}
                        {workspaceRanking.length === 0 && (
                          <tr><td colSpan={6} className="py-8 text-center text-xs" style={{ color: "var(--text-muted)" }}>Nenhum workspace com apontamentos no período</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Workspace charts */}
                  {workspaceRanking.length > 0 && (
                    <div className="premium-card rounded-md p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-4" style={{ color: "var(--text-muted)" }}>Top Workspaces — Gráfico de Horas</p>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <ReBarChart data={workspaceRanking.slice(0, 10)} layout="vertical" margin={{ top: 0, right: 0, left: 110, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="2 4" stroke="#0d0d0f" horizontal={false} />
                            <XAxis type="number" stroke="#27272a" fontSize={9} tickLine={false} axisLine={false} />
                            <YAxis type="category" dataKey="name" stroke="#27272a" fontSize={9} tickLine={false} axisLine={false} width={110} tick={{ fill: "#71717a" }} />
                            <Tooltip
                              contentStyle={{ background: "#08080a", border: "1px solid #1a1a1d", borderRadius: "4px", fontSize: "11px" }}
                              itemStyle={{ color: "#f87171" }}
                              labelStyle={{ color: "#fff", fontWeight: "bold" }}
                              formatter={(val: any) => [`${parseFloat(val).toFixed(1)}h`, "Horas"]}
                            />
                            <Bar dataKey="hours" fill="#dc2626" radius={[0, 2, 2, 0]} maxBarSize={14} />
                          </ReBarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ─── LOG DE HORAS TAB ─── */}
              {activeTab === "detailed" && (
                <div className="space-y-3">
                  {/* Search */}
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1 max-w-xs">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-muted)" }} />
                      <input
                        type="text"
                        placeholder="Buscar por tarefa, workspace..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full rounded border text-[11px] pl-8 pr-3 py-1.5 text-white"
                        style={{ background: "#050507", borderColor: "var(--border)" }}
                      />
                    </div>
                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                      {filteredLogs.length} apontamentos · {totalHours.toFixed(1)}h total
                    </p>
                  </div>

                  <div className="premium-card rounded-md overflow-hidden">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b" style={{ borderColor: "var(--border-subtle)" }}>
                          {["ID", "Data", "Profissional", "Workspace", "Projeto", "Tarefa", "Horas"].map((h, i) => (
                            <th key={i} className={`py-3 px-3 text-[9px] font-bold uppercase tracking-wider ${i === 6 ? "text-right" : "text-left"}`} style={{ color: "var(--text-muted)", background: "#03030a" }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedLogs.length === 0 ? (
                          <tr><td colSpan={7} className="py-10 text-center text-xs" style={{ color: "var(--text-muted)" }}>Nenhum apontamento encontrado.</td></tr>
                        ) : (
                          paginatedLogs.map(log => (
                            <tr key={log.id} className="table-row-hover border-b" style={{ borderColor: "var(--border-subtle)" }}>
                              <td className="py-2.5 px-3 text-[9px] mono-nums" style={{ color: "var(--text-muted)" }}>#{log.id}</td>
                              <td className="py-2.5 px-3 text-[10px] mono-nums" style={{ color: "var(--text-muted)" }}>
                                {new Date(log.date).toLocaleDateString("pt-BR")}
                              </td>
                              <td className="py-2.5 px-3 text-[10px] max-w-[120px] truncate" style={{ color: "#a1a1aa" }} title={log.professional}>{log.professional}</td>
                              <td className="py-2.5 px-3">
                                <span className="text-[10px] font-semibold" style={{ color: "#f87171" }}>{log.workspace}</span>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="badge-idle text-[9px] px-1.5 py-0.5 rounded font-medium max-w-[120px] truncate block" title={log.project}>{log.project}</span>
                              </td>
                              <td className="py-2.5 px-3 text-[10px] max-w-[200px] truncate" style={{ color: "#e4e4e7" }} title={log.task}>{log.task}</td>
                              <td className="py-2.5 px-3 text-right text-[11px] font-bold text-white mono-nums">{log.hours.toFixed(1)}h</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="px-4 py-3 flex items-center justify-between border-t" style={{ borderColor: "var(--border)" }}>
                        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                          {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredLogs.length)} de {filteredLogs.length}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-1 rounded border transition-colors disabled:opacity-25"
                            style={{ borderColor: "var(--border)", background: "transparent", color: "var(--text-muted)" }}
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-[10px] px-2" style={{ color: "var(--text-muted)" }}>{currentPage}/{totalPages}</span>
                          <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="p-1 rounded border transition-colors disabled:opacity-25"
                            style={{ borderColor: "var(--border)", background: "transparent", color: "var(--text-muted)" }}
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
