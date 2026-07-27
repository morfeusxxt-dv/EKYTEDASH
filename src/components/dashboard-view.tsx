"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/auth-context";
import {
  BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart as ReLineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  LogOut, Calendar, Layers, Clock, Briefcase, Search, ChevronLeft,
  ChevronRight, BarChart3, FileText, User, Users, Activity, ChevronDown,
  FolderKanban, TrendingUp, Lightbulb, Thermometer,
} from "lucide-react";

// ─── Tipos ─────────────────────────────────────────────────────────────────
interface HourLog {
  id: string;
  date: string;
  task: string;
  professional: string; // email
  executor: string;     // nome amigável
  hours: number;
  workspace: string;
  project: string;
  diaSemana: string;
  diaSemanaIdx: number;
  horaInicio: number;
  interno: boolean;
}
interface UserInfo { id: string; email: string; name: string; }

// ─── Helpers ────────────────────────────────────────────────────────────────
const DIAS_ORDEM = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
const PALETTE = ["#e6402e","#e66e2e","#4c8de8","#4fae81","#e2a23b","#9b59b6","#1abc9c","#e74c3c"];

function fmtH(min: number): string {
  if (min < 60) return `${Math.round(min)}m`;
  const h = min / 60;
  return h >= 1000 ? `${(h / 1000).toFixed(1)}k` : h % 1 === 0 ? `${h}` : `${h.toFixed(1)}`;
}
function fmtHours(h: number): string {
  return h >= 1000 ? `${(h / 1000).toFixed(1)}k` : h % 1 === 0 ? `${h}` : `${h.toFixed(1)}`;
}
function pct(a: number, b: number): number { return b === 0 ? 0 : Math.round((a / b) * 100); }

const tooltipStyle = {
  contentStyle: { background: "#1e1f26", border: "1px solid #2a2b33", borderRadius: "8px", fontSize: "12px" },
  itemStyle: { color: "#e6402e" },
  labelStyle: { color: "#e8e9ef", fontWeight: "bold" },
};

// ─── Componente Principal ───────────────────────────────────────────────────
type Tab = "overview" | "executors" | "workspaces" | "schedule" | "tasks" | "insights" | "log";

export function DashboardView() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  // Filtros
  const [period, setPeriod] = useState<"current-month" | "last-30" | "custom">("current-month");
  const [selectedInvestor, setSelectedInvestor] = useState<string>("all");
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>("all");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Dados
  const [allUsers, setAllUsers] = useState<UserInfo[]>([]);
  const [logs, setLogs] = useState<HourLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Paginação log
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 15;

  // ── Carrega usuários
  useEffect(() => {
    fetch("/api/users").then(r => r.ok ? r.json() : null).then(j => {
      if (j?.data) setAllUsers(j.data);
    }).catch(() => {});
  }, []);

  // ── Carrega apontamentos
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError(null);

    const qp = new URLSearchParams();
    qp.append("workspaces", user.workspaces.join(","));

    if (selectedInvestor !== "all") {
      const mu = allUsers.find(u => u.email === selectedInvestor);
      if (mu?.id) qp.append("executorId", mu.id);
      qp.append("professional", selectedInvestor);
    }

    const now = new Date();
    let start = "", end = "";
    if (period === "current-month") {
      start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      end   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
    } else if (period === "last-30") {
      const d = new Date(); d.setDate(now.getDate() - 30);
      start = d.toISOString().split("T")[0];
      end   = now.toISOString().split("T")[0];
    } else if (period === "custom" && customStartDate && customEndDate) {
      start = customStartDate; end = customEndDate;
    }
    if (start && end) { qp.append("startDate", start); qp.append("endDate", end); }

    fetch(`/api/hours?${qp.toString()}`)
      .then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e)))
      .then(j => { setLogs(j.data || []); })
      .catch(e => { setError(e?.error || "Erro de rede"); setLogs([]); })
      .finally(() => setLoading(false));
  }, [user, period, customStartDate, customEndDate, selectedInvestor, allUsers]);

  // ── Filtros locais
  const filteredLogs = useMemo(() => logs.filter(l =>
    (selectedWorkspace === "all" || l.workspace === selectedWorkspace) &&
    (searchQuery === "" || [l.task, l.workspace, l.executor, l.project]
      .some(f => f.toLowerCase().includes(searchQuery.toLowerCase())))
  ), [logs, selectedWorkspace, searchQuery]);

  // ── Listas dinâmicas
  const workspacesList = useMemo(() => [...new Set(logs.map(l => l.workspace))].sort(), [logs]);
  const projectsList   = useMemo(() => [...new Set(logs.map(l => l.project))].sort(), [logs]);

  // ── KPIs
  const totalMin        = useMemo(() => filteredLogs.reduce((a, c) => a + c.hours * 60, 0), [filteredLogs]);
  const totalHours      = totalMin / 60;
  const totalLogs       = filteredLogs.length;
  const uniqueExec      = useMemo(() => new Set(filteredLogs.map(l => l.executor)).size, [filteredLogs]);
  const uniqueWs        = useMemo(() => new Set(filteredLogs.map(l => l.workspace)).size, [filteredLogs]);
  const minInterno      = useMemo(() => filteredLogs.filter(l => l.interno).reduce((a, c) => a + c.hours * 60, 0), [filteredLogs]);
  const minCliente      = totalMin - minInterno;

  // ── Ranking executores
  const execTotals = useMemo(() => {
    const map: Record<string, { nome: string; min: number; logs: number; wss: Set<string> }> = {};
    filteredLogs.forEach(l => {
      const k = l.executor;
      if (!map[k]) map[k] = { nome: k, min: 0, logs: 0, wss: new Set() };
      map[k].min += l.hours * 60;
      map[k].logs += 1;
      map[k].wss.add(l.workspace);
    });
    return Object.values(map)
      .map(e => ({ ...e, wss: e.wss.size }))
      .sort((a, b) => b.min - a.min);
  }, [filteredLogs]);

  // ── Ranking workspaces
  const wsTotals = useMemo(() => {
    const map: Record<string, { nome: string; min: number; logs: number; execs: Set<string>; interno: boolean }> = {};
    filteredLogs.forEach(l => {
      const k = l.workspace;
      if (!map[k]) map[k] = { nome: k, min: 0, logs: 0, execs: new Set(), interno: l.interno };
      map[k].min += l.hours * 60;
      map[k].logs += 1;
      map[k].execs.add(l.executor);
    });
    return Object.values(map)
      .map(w => ({ ...w, execs: w.execs.size }))
      .sort((a, b) => b.min - a.min);
  }, [filteredLogs]);

  const maxExecMin = execTotals[0]?.min || 1;
  const maxWsMin   = wsTotals[0]?.min  || 1;

  // ── Donut executores
  const execPieData = useMemo(() =>
    execTotals.slice(0, 8).map(e => ({ name: e.nome.split(" ")[0], value: parseFloat((e.min / 60).toFixed(1)) })),
    [execTotals]);

  // ── Donut interno vs cliente
  const internoPieData = [
    { name: "Workspaces de cliente", value: parseFloat((minCliente / 60).toFixed(1)) },
    { name: "Workspace interno", value: parseFloat((minInterno / 60).toFixed(1)) },
  ];

  // ── Por dia da semana
  const minPorDia = useMemo(() => {
    const map: Record<string, number> = {};
    DIAS_ORDEM.forEach(d => { map[d] = 0; });
    filteredLogs.forEach(l => { if (map[l.diaSemana] !== undefined) map[l.diaSemana] += l.hours * 60; });
    return DIAS_ORDEM.map(dia => ({ dia, min: map[dia] || 0 }));
  }, [filteredLogs]);

  // ── Por hora do dia
  const horaBuckets = useMemo(() => {
    const map: Record<number, number> = {};
    for (let i = 6; i <= 22; i++) map[i] = 0;
    filteredLogs.forEach(l => { if (l.horaInicio >= 6 && l.horaInicio <= 22) map[l.horaInicio] = (map[l.horaInicio] || 0) + 1; });
    return map;
  }, [filteredLogs]);
  const horaLineData = useMemo(() =>
    Object.entries(horaBuckets).sort((a, b) => +a[0] - +b[0])
      .map(([h, v]) => ({ hora: `${String(h).padStart(2, "0")}h`, count: v })),
    [horaBuckets]);

  // ── Heatmap executor × dia
  const heatData = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    filteredLogs.forEach(l => {
      if (!map[l.executor]) { map[l.executor] = {}; DIAS_ORDEM.forEach(d => { map[l.executor][d] = 0; }); }
      if (DIAS_ORDEM.includes(l.diaSemana)) map[l.executor][l.diaSemana] += l.hours * 60;
    });
    return map;
  }, [filteredLogs]);
  const maxHeatVal = useMemo(() =>
    Math.max(1, ...Object.values(heatData).flatMap(e => Object.values(e))),
    [heatData]);

  function heatColor(val: number): string {
    if (val === 0) return "rgba(255,255,255,0.02)";
    const p = val / maxHeatVal;
    return `rgba(230,64,46,${(0.12 + p * 0.75).toFixed(2)})`;
  }

  // ── Tipo de tarefa
  const tipoTarefaData = useMemo(() => {
    const map: Record<string, { tipo: string; min: number; count: number }> = {};
    filteredLogs.forEach(l => {
      if (!map[l.project]) map[l.project] = { tipo: l.project, min: 0, count: 0 };
      map[l.project].min += l.hours * 60;
      map[l.project].count += 1;
    });
    return Object.values(map).sort((a, b) => b.min - a.min).slice(0, 12);
  }, [filteredLogs]);

  // ── Insights auto-gerados
  const insights = useMemo(() => {
    if (execTotals.length < 2) return [];
    const topExec = execTotals[0];
    const lowExec = execTotals[execTotals.length - 1];
    const spread  = (topExec.min / (lowExec.min || 1)).toFixed(1);
    const pctInt  = pct(minInterno, totalMin);
    const pctCli  = 100 - pctInt;
    const topDia  = [...minPorDia].sort((a, b) => b.min - a.min)[0];
    const topWs   = wsTotals[0];
    const topTipo = tipoTarefaData[0];
    const topTipoPct = topTipo ? pct(topTipo.min, totalMin) : 0;
    const peakHora = horaLineData.reduce((a, b) => b.count > a.count ? b : a, horaLineData[0]);

    return [
      {
        tag: "Distribuição de carga", kind: "warn",
        title: `Diferença de ${spread}× entre o executor com mais e menos horas`,
        text: `<b>${topExec.nome}</b> registrou <b>${fmtH(topExec.min)}h</b> no período, enquanto <b>${lowExec.nome}</b> registrou apenas <b>${fmtH(lowExec.min)}h</b>. Vale entender se a diferença reflete alocação de projetos, ausências ou subregistro de horas.`,
      },
      {
        tag: "Interno vs. cliente", kind: pctInt > 30 ? "warn" : "good",
        title: `${pctInt}% das horas foram para workspace interno`,
        text: `De <b>${fmtH(totalMin)}h</b> totais, <b>${fmtH(minInterno)}h (${pctInt}%)</b> foram internas e <b>${pctCli}%</b> em contas de cliente. O workspace com mais horas foi <b>${topWs?.nome || "—"}</b> com <b>${fmtH(topWs?.min || 0)}h</b>.`,
      },
      {
        tag: "Ritmo semanal", kind: "default",
        title: `${topDia?.dia || "—"}-feira concentra o pico de horas (${fmtH(topDia?.min || 0)}h)`,
        text: `O volume de horas é maior em <b>${topDia?.dia || "—"}</b>, com queda natural nos fins de semana. O time mantém um ritmo consistente ao longo da semana.`,
      },
      {
        tag: "Workspaces", kind: "info",
        title: `${uniqueWs} workspaces ativos com ${totalLogs} apontamentos`,
        text: `O workspace mais demandado é <b>${topWs?.nome || "—"}</b> com <b>${fmtH(topWs?.min || 0)}h</b> registradas e <b>${topWs?.execs || 0} profissionais</b> envolvidos.`,
      },
      {
        tag: "Classificação de tarefas", kind: topTipoPct > 40 ? "warn" : "default",
        title: topTipo ? `"${topTipo.tipo.length > 40 ? topTipo.tipo.slice(0, 38) + "…" : topTipo.tipo}" concentra ${topTipoPct}% das horas` : "Nenhum tipo de tarefa identificado",
        text: topTipo ? `Esse tipo de tarefa concentra <b>${fmtH(topTipo.min)}h</b> — ${topTipoPct > 40 ? "um percentual alto que pode indicar uso como categoria catch-all em vez de classificação correta" : "dentro de um limite razoável de concentração"}.` : "Dados insuficientes.",
      },
      {
        tag: "Janela de trabalho", kind: "good",
        title: peakHora ? `Concentração forte de início às ${peakHora.hora}` : "Padrão de início de tarefas",
        text: peakHora
          ? `O horário de início mais comum dos apontamentos é <b>${peakHora.hora}</b>, com <b>${peakHora.count} apontamentos</b>. O time mantém uma janela de trabalho bem definida.`
          : "Não há dados de horário disponíveis para este período.",
      },
    ];
  }, [execTotals, minInterno, totalMin, minPorDia, wsTotals, tipoTarefaData, horaLineData, uniqueWs, totalLogs]);

  // ── Paginação log
  const totalPages   = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = useMemo(() => filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage), [filteredLogs, currentPage]);
  useEffect(() => { setCurrentPage(1); }, [selectedInvestor, selectedWorkspace, period, searchQuery]);

  // ─── NAV ITEMS ─────────────────────────────────────────────────────────────
  const navItems: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "overview",   label: "Visão Geral",    icon: <BarChart3   className="w-3.5 h-3.5 shrink-0" /> },
    { id: "executors",  label: "Por Executor",   icon: <Users        className="w-3.5 h-3.5 shrink-0" /> },
    { id: "workspaces", label: "Por Workspace",  icon: <Layers       className="w-3.5 h-3.5 shrink-0" /> },
    { id: "schedule",   label: "Ritmo Semanal",  icon: <Thermometer  className="w-3.5 h-3.5 shrink-0" /> },
    { id: "tasks",      label: "Tipos de Tarefa",icon: <FolderKanban className="w-3.5 h-3.5 shrink-0" /> },
    { id: "insights",   label: "Insights",       icon: <Lightbulb    className="w-3.5 h-3.5 shrink-0" /> },
    { id: "log",        label: "Log de Horas",   icon: <FileText     className="w-3.5 h-3.5 shrink-0" /> },
  ];

  return (
    <div className="flex min-h-screen" style={{ background: "var(--background)", color: "var(--foreground)" }}>

      {/* ─── SIDEBAR ───────────────────────────────────────────────────────── */}
      <aside className="w-52 shrink-0 flex flex-col justify-between py-5 px-3 z-20 border-r" style={{ background: "var(--sidebar-bg)", borderColor: "var(--border)" }}>
        <div>
          {/* Logo */}
          <div className="flex items-center gap-2 mb-6 px-2">
            <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: "var(--red)" }}>
              <span className="text-white font-black text-xs">eK</span>
            </div>
            <span className="text-[11px] font-bold tracking-wider uppercase" style={{ color: "var(--off-white)" }}>
              eKyte<span className="font-normal" style={{ color: "var(--muted)" }}> Dash</span>
            </span>
          </div>

          {/* Nav */}
          <nav className="space-y-0.5">
            {navItems.map(n => (
              <button key={n.id} onClick={() => setActiveTab(n.id)} className={`nav-item ${activeTab === n.id ? "active" : ""}`}>
                {n.icon}{n.label}
              </button>
            ))}
          </nav>

          {/* Mini stats */}
          <div className="mt-5 border-t pt-5 px-2 space-y-2.5" style={{ borderColor: "var(--border)" }}>
            <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "var(--muted-2)" }}>Resumo</p>
            {[
              { label: "Horas", value: `${fmtHours(totalHours)}h` },
              { label: "Workspaces", value: String(uniqueWs) },
              { label: "Executores", value: String(uniqueExec) },
              { label: "Apontamentos", value: String(totalLogs) },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between">
                <span className="text-[10px]" style={{ color: "var(--muted)" }}>{s.label}</span>
                <span className="text-[11px] font-bold mono-nums" style={{ color: "var(--off-white)" }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* User footer */}
        <div>
          <div className="border-t mb-3" style={{ borderColor: "var(--border)" }} />
          <div className="px-2">
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold uppercase border"
                style={{ background: "var(--red-soft)", borderColor: "rgba(230,64,46,0.2)", color: "var(--red)" }}>
                {user?.name?.slice(0, 2) || "?"}
              </div>
              <div className="truncate">
                <p className="text-[10px] font-semibold truncate" style={{ color: "var(--off-white)" }}>{user?.name}</p>
                <p className="text-[9px]" style={{ color: "var(--muted)" }}>Gestor</p>
              </div>
            </div>
            <button onClick={logout} className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded text-[10px] font-semibold transition-colors"
              style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--muted)" }}
              onMouseEnter={e => { (e.currentTarget).style.color = "var(--red)"; }}
              onMouseLeave={e => { (e.currentTarget).style.color = "var(--muted)"; }}>
              <LogOut className="w-3 h-3" /> Sair
            </button>
          </div>
        </div>
      </aside>

      {/* ─── MAIN ──────────────────────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">

        {/* ── TOPBAR ── */}
        <header className="h-14 flex items-center justify-between px-5 shrink-0 border-b" style={{ background: "var(--background)", borderColor: "var(--border)" }}>
          <div className="flex items-center gap-3">
            <div className="flex rounded overflow-hidden border text-[10px]" style={{ borderColor: "var(--border)" }}>
              {(["current-month", "last-30", "custom"] as const).map((p, i) => (
                <button key={p} onClick={() => setPeriod(p)} className="px-3 py-1.5 font-semibold transition-colors" style={{
                  background: period === p ? "var(--card)" : "transparent",
                  color: period === p ? "var(--off-white)" : "var(--muted)",
                  borderLeft: i > 0 ? "1px solid var(--border)" : "none"
                }}>
                  {p === "current-month" ? "Mês Atual" : p === "last-30" ? "30 Dias" : "Período"}
                </button>
              ))}
            </div>
            {period === "custom" && (
              <div className="flex items-center gap-1.5 rounded border px-2 py-1 text-[10px]" style={{ borderColor: "var(--border)" }}>
                <Calendar className="w-3 h-3" style={{ color: "var(--muted)" }} />
                <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} className="bg-transparent text-[10px] border-0 w-24" style={{ color: "var(--off-white)" }} />
                <span style={{ color: "var(--muted)" }}>–</span>
                <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} className="bg-transparent text-[10px] border-0 w-24" style={{ color: "var(--off-white)" }} />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Profissional */}
            <div className="relative flex items-center">
              <User className="w-3 h-3 absolute left-2 pointer-events-none" style={{ color: "var(--muted)" }} />
              <select value={selectedInvestor} onChange={e => setSelectedInvestor(e.target.value)}
                className="pl-6 pr-6 py-1.5 rounded border text-[10px] font-semibold appearance-none cursor-pointer"
                style={{ background: "var(--sidebar-bg)", borderColor: "var(--border)", color: selectedInvestor !== "all" ? "var(--red)" : "var(--muted)" }}>
                <option value="all">Todos os Profissionais</option>
                {allUsers.map(u => <option key={u.email} value={u.email}>{u.name || u.email}</option>)}
              </select>
              <ChevronDown className="w-3 h-3 absolute right-1.5 pointer-events-none" style={{ color: "var(--muted)" }} />
            </div>
            {/* Workspace */}
            <div className="relative flex items-center">
              <Layers className="w-3 h-3 absolute left-2 pointer-events-none" style={{ color: "var(--muted)" }} />
              <select value={selectedWorkspace} onChange={e => setSelectedWorkspace(e.target.value)}
                className="pl-6 pr-6 py-1.5 rounded border text-[10px] font-medium appearance-none cursor-pointer"
                style={{ background: "var(--sidebar-bg)", borderColor: "var(--border)", color: selectedWorkspace !== "all" ? "var(--off-white)" : "var(--muted)" }}>
                <option value="all">Todos os Workspaces</option>
                {workspacesList.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
              <ChevronDown className="w-3 h-3 absolute right-1.5 pointer-events-none" style={{ color: "var(--muted)" }} />
            </div>
          </div>
        </header>

        {/* ── CONTENT ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 spin-loader" style={{ borderColor: "var(--border)", borderTopColor: "var(--red)" }} />
              <p className="text-xs" style={{ color: "var(--muted)" }}>Consultando API eKyte...</p>
            </div>
          ) : error ? (
            <div className="min-h-[400px] flex flex-col items-center justify-center gap-4 max-w-md mx-auto text-center">
              <p className="text-xs font-bold" style={{ color: "var(--off-white)" }}>Erro de conexão com eKyte</p>
              <p className="text-[11px]" style={{ color: "var(--muted)" }}>{error}</p>
              <div className="text-[10px] rounded border p-3 w-full text-left" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
                Verifique <strong style={{ color: "var(--off-white)" }}>EKYTE_API_TOKEN</strong> e <strong style={{ color: "var(--off-white)" }}>EKYTE_COMPANY_ID</strong>.
              </div>
            </div>
          ) : (
            <>
              {/* ─── KPI Strip — sempre visível ──────────────────────────────── */}
              <div className="grid grid-cols-6 gap-3">
                {[
                  { label: "Total de Horas", value: `${fmtHours(totalHours)}h`, icon: <Clock className="w-4 h-4" /> },
                  { label: "Apontamentos",   value: String(totalLogs),           icon: <Activity className="w-4 h-4" /> },
                  { label: "Executores",     value: String(uniqueExec),           icon: <Users className="w-4 h-4" /> },
                  { label: "Workspaces",     value: String(uniqueWs),            icon: <Layers className="w-4 h-4" /> },
                  { label: "Horas Cliente",  value: `${fmtHours(minCliente / 60)}h`, icon: <Briefcase className="w-4 h-4" /> },
                  { label: "Horas Interno",  value: `${fmtHours(minInterno / 60)}h`, icon: <TrendingUp className="w-4 h-4" /> },
                ].map((kpi, i) => (
                  <div key={i} className="kpi">
                    <div className="kpi-icon">{kpi.icon}</div>
                    <div className="kpi-num">{kpi.value}</div>
                    <div className="kpi-lbl">{kpi.label}</div>
                  </div>
                ))}
              </div>

              {/* ─── OVERVIEW ─────────────────────────────────────────────── */}
              {activeTab === "overview" && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-5">
                    {/* Top 5 executores */}
                    <div className="card">
                      <div className="mb-4">
                        <p className="section-title">Por Executor <span className="section-tag">Ranking de horas</span></p>
                        <p className="section-sub mt-1">Total por pessoa no período</p>
                      </div>
                      <div>
                        {execTotals.slice(0, 5).map((e, i) => (
                          <div key={e.nome} className="rank-row">
                            <span className="rank-pos" style={{ color: i === 0 ? "var(--red)" : "var(--muted-2)" }}>{i + 1}</span>
                            <span className="rank-name">{e.nome}</span>
                            <div className="rank-barbg">
                              <div className="rank-barfill" style={{ width: `${pct(e.min, maxExecMin)}%` }} />
                            </div>
                            <span className="rank-val">{fmtH(e.min)}h</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Top 5 workspaces */}
                    <div className="card">
                      <div className="mb-4">
                        <p className="section-title">Por Workspace <span className="section-tag">Ranking</span></p>
                        <p className="section-sub mt-1">Workspaces que mais consumiram horas</p>
                      </div>
                      <div>
                        {wsTotals.slice(0, 5).map((w, i) => (
                          <div key={w.nome} className="rank-row">
                            <span className="rank-pos" style={{ color: i === 0 ? "var(--red)" : "var(--muted-2)" }}>{i + 1}</span>
                            <span className="rank-name">{w.nome} <span className={`ws-tag ${w.interno ? "interno" : "cliente"}`}>{w.interno ? "int" : "cli"}</span></span>
                            <div className="rank-barbg">
                              <div className="rank-barfill" style={{ width: `${pct(w.min, maxWsMin)}%` }} />
                            </div>
                            <span className="rank-val">{fmtH(w.min)}h</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  {/* Bar semanal overview */}
                  <div className="card">
                    <p className="section-title mb-4">Horas por dia da semana <span className="section-tag">Ritmo</span></p>
                    <div className="h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <ReBarChart data={minPorDia} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" vertical={false} />
                          <XAxis dataKey="dia" stroke="var(--muted-2)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => v.slice(0, 3)} />
                          <YAxis stroke="var(--muted-2)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 60).toFixed(0)}h`} />
                          <Tooltip {...tooltipStyle} formatter={(v: any) => [`${fmtH(v as number)}h`, "Horas"]} />
                          <Bar dataKey="min" fill="var(--red)" radius={[4, 4, 0, 0]} maxBarSize={40}
                            label={false}
                            isAnimationActive={true} />
                        </ReBarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── EXECUTORS ─────────────────────────────────────────────── */}
              {activeTab === "executors" && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-5">
                    {/* Ranking completo */}
                    <div className="card">
                      <div className="mb-4">
                        <p className="section-title">Ranking de Executores <span className="section-tag">Horas totais</span></p>
                        <p className="section-sub mt-1">Horas realizadas no período por pessoa</p>
                      </div>
                      {execTotals.map((e, i) => (
                        <div key={e.nome} className="rank-row">
                          <span className="rank-pos" style={{ color: i === 0 ? "var(--red)" : "var(--muted-2)" }}>{i + 1}</span>
                          <span className="rank-name">{e.nome}</span>
                          <div className="rank-barbg">
                            <div className="rank-barfill" style={{ width: `${pct(e.min, maxExecMin)}%` }} />
                          </div>
                          <span className="rank-val">{fmtH(e.min)}h</span>
                        </div>
                      ))}
                    </div>
                    {/* Donut executores */}
                    <div className="card flex flex-col items-center">
                      <p className="section-title mb-4 w-full">Distribuição de horas</p>
                      <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                          <Pie data={execPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={110} strokeWidth={0}>
                            {execPieData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                          </Pie>
                          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px", color: "var(--muted)" }} />
                          <Tooltip {...tooltipStyle} formatter={(v: any) => [`${v}h`, ""]} />
                        </PieChart>
                      </ResponsiveContainer>
                      {/* Tabela detalhada */}
                      <div className="w-full mt-4">
                        <table className="v4-table">
                          <thead><tr>
                            <th>#</th><th>Executor</th><th>Workspaces</th><th>Apont.</th><th style={{ textAlign: "right" }}>Horas</th>
                          </tr></thead>
                          <tbody>
                            {execTotals.map((e, i) => (
                              <tr key={e.nome}>
                                <td><span style={{ fontFamily: "Montserrat", fontWeight: 700, color: i === 0 ? "var(--red)" : "var(--muted)" }}>{i + 1}</span></td>
                                <td style={{ fontWeight: 600 }}>{e.nome}</td>
                                <td><span className="ws-tag cliente">{e.wss} ws</span></td>
                                <td style={{ color: "var(--muted)" }}>{e.logs}</td>
                                <td className="num">{fmtH(e.min)}h</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── WORKSPACES ────────────────────────────────────────────── */}
              {activeTab === "workspaces" && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-5">
                    {/* Bar horizontal */}
                    <div className="card">
                      <div className="mb-4">
                        <p className="section-title">Ranking de Workspaces <span className="section-tag">Interno vs. Cliente</span></p>
                        <p className="section-sub mt-1">Onde as horas do time estão sendo investidas</p>
                      </div>
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <ReBarChart data={wsTotals.slice(0, 10)} layout="vertical" margin={{ top: 0, right: 0, left: 130, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                            <XAxis type="number" stroke="var(--muted-2)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 60).toFixed(0)}h`} />
                            <YAxis type="category" dataKey="nome" stroke="var(--muted-2)" fontSize={10} tickLine={false} axisLine={false} width={130} tick={{ fill: "var(--muted)" }} />
                            <Tooltip {...tooltipStyle} formatter={(v: any) => [`${fmtH(v as number)}h`, "Horas"]} />
                            <Bar dataKey="min" fill="var(--red)" radius={[0, 4, 4, 0]} maxBarSize={16} />
                          </ReBarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    {/* Donut interno vs cliente */}
                    <div className="card flex flex-col">
                      <p className="section-title mb-2">Interno vs. Cliente</p>
                      <p className="section-sub mb-4">Como as horas se dividem entre atividades internas e contas de clientes</p>
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie data={internoPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={95} strokeWidth={0}>
                            <Cell fill="var(--green)" />
                            <Cell fill="var(--blue)" />
                          </Pie>
                          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px", color: "var(--muted)" }} />
                          <Tooltip {...tooltipStyle} formatter={(v: any) => [`${v}h`, ""]} />
                        </PieChart>
                      </ResponsiveContainer>
                      {/* Resumo texto */}
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        {[
                          { label: "Cliente", value: `${fmtHours(minCliente / 60)}h`, pct: pct(minCliente, totalMin), color: "var(--green)" },
                          { label: "Interno", value: `${fmtHours(minInterno / 60)}h`, pct: pct(minInterno, totalMin), color: "var(--blue)" },
                        ].map(s => (
                          <div key={s.label} className="rounded-lg p-3 text-center" style={{ background: "var(--bg-soft)", border: "1px solid var(--border)" }}>
                            <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--muted)" }}>{s.label}</div>
                            <div style={{ fontFamily: "Montserrat", fontWeight: 800, fontSize: 22, color: s.color }}>{s.value}</div>
                            <div className="text-[10px] mt-1" style={{ color: "var(--muted)" }}>{s.pct}% do total</div>
                          </div>
                        ))}
                      </div>
                      {/* Tabela */}
                      <div className="mt-4">
                        <table className="v4-table">
                          <thead><tr><th>#</th><th>Workspace</th><th>Tipo</th><th>Executores</th><th style={{ textAlign: "right" }}>Horas</th></tr></thead>
                          <tbody>
                            {wsTotals.map((w, i) => (
                              <tr key={w.nome}>
                                <td><span style={{ fontFamily: "Montserrat", fontWeight: 700, color: i === 0 ? "var(--red)" : "var(--muted)" }}>{i + 1}</span></td>
                                <td style={{ fontWeight: 600, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={w.nome}>{w.nome}</td>
                                <td><span className={`ws-tag ${w.interno ? "interno" : "cliente"}`}>{w.interno ? "Interno" : "Cliente"}</span></td>
                                <td style={{ color: "var(--muted)" }}>{w.execs}</td>
                                <td className="num">{fmtH(w.min)}h</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── SCHEDULE ──────────────────────────────────────────────── */}
              {activeTab === "schedule" && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-5">
                    {/* Bar por dia */}
                    <div className="card">
                      <p className="section-title mb-4">Horas por dia da semana <span className="section-tag">Ritmo semanal</span></p>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <ReBarChart data={minPorDia} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" vertical={false} />
                            <XAxis dataKey="dia" stroke="var(--muted-2)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => v.slice(0, 3)} />
                            <YAxis stroke="var(--muted-2)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 60).toFixed(0)}h`} />
                            <Tooltip {...tooltipStyle} formatter={(v: any) => [`${fmtH(v as number)}h`, "Horas"]} />
                            <Bar dataKey="min" radius={[4, 4, 0, 0]} maxBarSize={42}>
                              {minPorDia.map((d, i) => (
                                <Cell key={i} fill={d.dia === "Sábado" || d.dia === "Domingo" ? "rgba(230,64,46,0.35)" : "var(--red)"} />
                              ))}
                            </Bar>
                          </ReBarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    {/* Line por hora */}
                    <div className="card">
                      <p className="section-title mb-4">Quando o time começa tarefas <span className="section-tag">Por hora</span></p>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <ReLineChart data={horaLineData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" vertical={false} />
                            <XAxis dataKey="hora" stroke="var(--muted-2)" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis stroke="var(--muted-2)" fontSize={10} tickLine={false} axisLine={false} />
                            <Tooltip {...tooltipStyle} formatter={(v: any) => [`${v} apontamentos`, ""]} />
                            <Line type="monotone" dataKey="count" stroke="var(--red)" strokeWidth={2}
                              dot={{ fill: "var(--red)", r: 3 }}
                              activeDot={{ r: 5 }}
                            />
                          </ReLineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* Heatmap */}
                  <div className="card">
                    <p className="section-title mb-4">Mapa de calor — horas por executor × dia da semana <span className="section-tag">Heatmap</span></p>
                    <div className="heatmap-wrap">
                      <div className="heatmap">
                        {/* Header */}
                        <div className="hcell rowlabel colhead" style={{ color: "var(--muted-2)" }}>Executor</div>
                        {DIAS_ORDEM.map(d => (
                          <div key={d} className="hcell colhead" style={{ color: "var(--muted-2)" }}>{d.slice(0, 3)}</div>
                        ))}
                        {/* Rows */}
                        {execTotals.map(e => (
                          <React.Fragment key={e.nome}>
                            <div className="hcell rowlabel">{e.nome.split(" ")[0]}</div>
                            {DIAS_ORDEM.map(d => {
                              const v = heatData[e.nome]?.[d] || 0;
                              return (
                                <div key={d} className="heatcell" style={{ background: heatColor(v) }}>
                                  {v > 0 ? `${fmtH(v)}h` : "—"}
                                </div>
                              );
                            })}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── TASKS ─────────────────────────────────────────────────── */}
              {activeTab === "tasks" && (
                <div className="space-y-5">
                  <div className="card">
                    <div className="mb-4">
                      <p className="section-title">Tipo de Tarefa <span className="section-tag">Onde o tempo é gasto</span></p>
                      <p className="section-sub mt-1">Classificação das horas registradas por tipo de atividade</p>
                    </div>
                    <div style={{ height: Math.max(200, tipoTarefaData.length * 36) }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <ReBarChart data={tipoTarefaData} layout="vertical" margin={{ top: 0, right: 10, left: 220, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                          <XAxis type="number" stroke="var(--muted-2)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 60).toFixed(0)}h`} />
                          <YAxis type="category" dataKey="tipo" stroke="var(--muted-2)" fontSize={11} tickLine={false} axisLine={false} width={220}
                            tick={{ fill: "var(--muted)" }} tickFormatter={(v: string) => v.length > 36 ? v.slice(0, 34) + "…" : v} />
                          <Tooltip {...tooltipStyle} formatter={(v: any, _, p: any) => [`${fmtH(v as number)}h · ${p.payload?.count || 0} apont.`, ""]} />
                          <Bar dataKey="min" radius={[0, 4, 4, 0]} barSize={20}>
                            {tipoTarefaData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                          </Bar>
                        </ReBarChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Tabela de tipos */}
                    <div className="mt-5">
                      <table className="v4-table">
                        <thead><tr><th>#</th><th>Tipo de Tarefa</th><th>Apontamentos</th><th style={{ textAlign: "right" }}>% do total</th><th style={{ textAlign: "right" }}>Horas</th></tr></thead>
                        <tbody>
                          {tipoTarefaData.map((t, i) => (
                            <tr key={t.tipo}>
                              <td><span style={{ fontFamily: "Montserrat", fontWeight: 700, color: i === 0 ? "var(--red)" : "var(--muted)" }}>{i + 1}</span></td>
                              <td style={{ maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={t.tipo}>{t.tipo}</td>
                              <td style={{ color: "var(--muted)" }}>{t.count}</td>
                              <td className="num" style={{ color: "var(--muted)" }}>{pct(t.min, totalMin)}%</td>
                              <td className="num">{fmtH(t.min)}h</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── INSIGHTS ──────────────────────────────────────────────── */}
              {activeTab === "insights" && (
                <div className="space-y-5">
                  <div>
                    <p className="section-title">Insights <span className="section-tag">Leitura analítica</span></p>
                    <p className="section-sub mt-1">O que os números indicam sobre o período</p>
                  </div>
                  {insights.length === 0 ? (
                    <div className="card text-center py-10" style={{ color: "var(--muted)" }}>
                      Dados insuficientes para gerar insights. Carregue mais apontamentos.
                    </div>
                  ) : (
                    <div className="insights-grid">
                      {insights.map((ins, i) => (
                        <div key={i} className={`insight-card ${ins.kind}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="ibadge">{ins.tag}</span>
                          </div>
                          <p className="insight-title">{ins.title}</p>
                          <p className="insight-text" dangerouslySetInnerHTML={{ __html: ins.text }} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ─── LOG ───────────────────────────────────────────────────── */}
              {activeTab === "log" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="relative max-w-xs flex-1">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--muted)" }} />
                      <input type="text" placeholder="Buscar tarefa, workspace, executor..."
                        value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        className="w-full rounded border text-[11px] pl-8 pr-3 py-1.5"
                        style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--off-white)" }} />
                    </div>
                    <p className="text-[10px]" style={{ color: "var(--muted)" }}>
                      {filteredLogs.length} apontamentos · {fmtHours(totalHours)}h total
                    </p>
                  </div>

                  <div className="card" style={{ padding: 0 }}>
                    <table className="v4-table">
                      <thead><tr>
                        <th style={{ padding: "12px 14px 10px" }}>ID</th>
                        <th>Data</th>
                        <th>Dia</th>
                        <th>Executor</th>
                        <th>Workspace</th>
                        <th>Tipo</th>
                        <th>Tarefa</th>
                        <th style={{ textAlign: "right" }}>Horas</th>
                      </tr></thead>
                      <tbody>
                        {paginatedLogs.length === 0 ? (
                          <tr><td colSpan={8} style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>Nenhum apontamento encontrado.</td></tr>
                        ) : paginatedLogs.map(log => (
                          <tr key={log.id}>
                            <td style={{ color: "var(--muted-2)", fontSize: 10, paddingLeft: 14 }}>#{log.id}</td>
                            <td style={{ color: "var(--muted)", fontFamily: "Montserrat", fontSize: 11 }}>
                              {log.date ? new Date(log.date + "T12:00:00").toLocaleDateString("pt-BR") : "—"}
                            </td>
                            <td style={{ color: "var(--muted)", fontSize: 11 }}>{log.diaSemana || "—"}</td>
                            <td style={{ fontWeight: 600, fontSize: 12 }}>{log.executor || log.professional}</td>
                            <td>
                              <span style={{ fontWeight: 600, color: "var(--foreground)", fontSize: 11 }}>{log.workspace}</span>
                              {" "}<span className={`ws-tag ${log.interno ? "interno" : "cliente"}`}>{log.interno ? "int" : "cli"}</span>
                            </td>
                            <td style={{ maxWidth: 120 }}>
                              <span className="ws-tag cliente" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 110, display: "inline-block" }} title={log.project}>{log.project}</span>
                            </td>
                            <td style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--foreground)", fontSize: 11 }} title={log.task}>{log.task}</td>
                            <td className="num" style={{ color: "var(--off-white)", fontSize: 12, paddingRight: 14 }}>{log.hours.toFixed(1)}h</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {/* Paginação */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: "var(--line)" }}>
                        <span className="text-[10px]" style={{ color: "var(--muted)" }}>
                          {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredLogs.length)} de {filteredLogs.length}
                        </span>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                            className="p-1 rounded border disabled:opacity-25" style={{ borderColor: "var(--border)", background: "transparent", color: "var(--muted)" }}>
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-[10px] px-2" style={{ color: "var(--muted)" }}>{currentPage}/{totalPages}</span>
                          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                            className="p-1 rounded border disabled:opacity-25" style={{ borderColor: "var(--border)", background: "transparent", color: "var(--muted)" }}>
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
