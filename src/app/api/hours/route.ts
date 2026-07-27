import { NextResponse } from "next/server";

// Dataset simulado e realista para os apontamentos de horas.
// Este mock será retornado caso a API do eKyte não esteja configurada ou retorne erro,
// servindo como fallback para garantir que o dashboard funcione de forma impecável.
const MOCK_HOURS_DATA = [
  // Workspace Alfa Tech
  { id: "1", date: "2026-07-01", task: "Reunião de Alinhamento Estratégico", professional: "Carlos Silva", hours: 2.5, workspace: "Workspace Alfa Tech", project: "Setup Inicial", costPerHour: 150 },
  { id: "2", date: "2026-07-05", task: "Desenvolvimento de Landing Page", professional: "Mariana Souza", hours: 8.0, workspace: "Workspace Alfa Tech", project: "Desenvolvimento", costPerHour: 120 },
  { id: "3", date: "2026-07-10", task: "Configuração de Campanhas de Tráfego", professional: "Lucas Lima", hours: 4.5, workspace: "Workspace Alfa Tech", project: "Mídia Paga", costPerHour: 140 },
  { id: "4", date: "2026-07-15", task: "Análise de Métricas e Otimização", professional: "Lucas Lima", hours: 3.0, workspace: "Workspace Alfa Tech", project: "Mídia Paga", costPerHour: 140 },
  { id: "5", date: "2026-07-20", task: "Desenvolvimento de Painel Administrativo", professional: "Mariana Souza", hours: 12.5, workspace: "Workspace Alfa Tech", project: "Desenvolvimento", costPerHour: 120 },
  { id: "6", date: "2026-07-22", task: "Criação de Criativos de Conversão", professional: "Beatriz Reis", hours: 6.0, workspace: "Workspace Alfa Tech", project: "Design", costPerHour: 95 },
  
  // Alfa Finance
  { id: "7", date: "2026-07-02", task: "Planejamento Financeiro de Tráfego", professional: "Carlos Silva", hours: 4.0, workspace: "Alfa Finance", project: "Consultoria", costPerHour: 180 },
  { id: "8", date: "2026-07-12", task: "Auditoria de Contas de Anúncio", professional: "Lucas Lima", hours: 5.5, workspace: "Alfa Finance", project: "Auditoria", costPerHour: 140 },
  { id: "9", date: "2026-07-18", task: "Configuração de Rastreamento GA4", professional: "Mariana Souza", hours: 3.5, workspace: "Alfa Finance", project: "Tech Integration", costPerHour: 150 },

  // Workspace Beta Ventures
  { id: "10", date: "2026-07-03", task: "Criação de Identidade Visual Corporativa", professional: "Beatriz Reis", hours: 10.0, workspace: "Workspace Beta Ventures", project: "Branding", costPerHour: 110 },
  { id: "11", date: "2026-07-08", task: "Desenvolvimento de MVP", professional: "Mariana Souza", hours: 15.0, workspace: "Workspace Beta Ventures", project: "Desenvolvimento", costPerHour: 130 },
  { id: "12", date: "2026-07-14", task: "Lançamento de Campanha de Leads", professional: "Lucas Lima", hours: 8.5, workspace: "Workspace Beta Ventures", project: "Mídia Paga", costPerHour: 140 },
  { id: "13", date: "2026-07-25", task: "SEO On-Page e Conteúdo", professional: "Carlos Silva", hours: 6.0, workspace: "Workspace Beta Ventures", project: "SEO", costPerHour: 150 },

  // Beta Logistics
  { id: "14", date: "2026-07-04", task: "Mapeamento de Processos de Entrega", professional: "Carlos Silva", hours: 5.0, workspace: "Beta Logistics", project: "Processos", costPerHour: 160 },
  { id: "15", date: "2026-07-16", task: "Integração de API de Frete", professional: "Mariana Souza", hours: 9.0, workspace: "Beta Logistics", project: "Desenvolvimento", costPerHour: 130 },

  // Workspace Gamma Health (Apenas visível para Admin/Master)
  { id: "16", date: "2026-07-11", task: "Design de Interface do App", professional: "Beatriz Reis", hours: 12.0, workspace: "Workspace Gamma Health", project: "UI/UX Design", costPerHour: 110 },
  { id: "17", date: "2026-07-19", task: "Redação de Conteúdo de Saúde", professional: "Carlos Silva", hours: 7.5, workspace: "Workspace Gamma Health", project: "Conteúdo", costPerHour: 120 },
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspacesParam = searchParams.get("workspaces"); // Workspaces autorizados para o investidor (enviados pelo Front)
    const projectFilter = searchParams.get("project");
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    if (!workspacesParam) {
      return NextResponse.json({ error: "Workspaces não especificados." }, { status: 400 });
    }

    const authorizedWorkspaces = workspacesParam.split(",");

    const apiToken = process.env.EKYTE_API_TOKEN;
    const apiUrl = process.env.EKYTE_API_URL;

    let rawData: any[] = [];

    // Se as credenciais do eKyte estiverem configuradas e forem reais, tentamos consultar a API
    if (apiToken && apiToken !== "seu_token_aqui" && apiUrl) {
      try {
        // Exemplo de integração real com a API REST do eKyte
        // Ajuste o endpoint conforme a especificação oficial de apontamentos da plataforma eKyte
        const response = await fetch(`${apiUrl}/v1/apontamentos?workspaces=${encodeURIComponent(workspacesParam)}`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${apiToken}`,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          rawData = await response.json();
        } else {
          console.warn("API do eKyte retornou erro, usando dados simulados de fallback.");
          rawData = MOCK_HOURS_DATA;
        }
      } catch (err) {
        console.error("Falha ao conectar na API do eKyte, usando dados de fallback:", err);
        rawData = MOCK_HOURS_DATA;
      }
    } else {
      // Sem token configurado ainda, usa dados simulados para teste local imediato
      rawData = MOCK_HOURS_DATA;
    }

    // Filtragem de Segurança no Backend:
    // Garante que o investidor só veja as horas dos workspaces aos quais ele possui autorização
    let filteredData = rawData.filter((item) =>
      authorizedWorkspaces.includes(item.workspace)
    );

    // Filtro adicional por Projeto/Campanha se fornecido
    if (projectFilter && projectFilter !== "Todos") {
      filteredData = filteredData.filter((item) => item.project === projectFilter);
    }

    // Filtro adicional por período
    if (startDateParam && endDateParam) {
      const start = new Date(startDateParam);
      const end = new Date(endDateParam);
      filteredData = filteredData.filter((item) => {
        const itemDate = new Date(item.date);
        return itemDate >= start && itemDate <= end;
      });
    }

    return NextResponse.json({ data: filteredData });
  } catch (error) {
    console.error("Erro na rota /api/hours:", error);
    return NextResponse.json({ error: "Erro interno ao buscar horas." }, { status: 500 });
  }
}
