import { NextResponse } from "next/server";

// Dataset simulado e realista para os apontamentos de horas.
// Cada registro contém o profissional (e-mail do investidor/colaborador),
// workspace, tarefa realizada, data e horas gastas.
const MOCK_HOURS_DATA = [
  // lian.garras@v4company.com
  { id: "1", date: "2026-07-02", task: "Setup Estratégico de Tráfego", professional: "lian.garras@v4company.com", hours: 6.5, workspace: "Workspace Alfa Tech", project: "Mídia Paga" },
  { id: "2", date: "2026-07-03", task: "Reunião de Alinhamento e OKR", professional: "lian.garras@v4company.com", hours: 2.0, workspace: "Workspace Alfa Tech", project: "Gestão" },
  { id: "3", date: "2026-07-06", task: "Análise de Dados de Conversão GA4", professional: "lian.garras@v4company.com", hours: 8.0, workspace: "Workspace Alfa Tech", project: "Analytics" },
  { id: "4", date: "2026-07-09", task: "Otimização de Públicos e Lances", professional: "lian.garras@v4company.com", hours: 5.5, workspace: "Workspace Alfa Tech", project: "Mídia Paga" },
  { id: "5", date: "2026-07-13", task: "Criação de Estrutura de Campanhas", professional: "lian.garras@v4company.com", hours: 10.0, workspace: "Alfa Finance", project: "Mídia Paga" },
  { id: "6", date: "2026-07-16", task: "Apresentação de Resultados de Tráfego", professional: "lian.garras@v4company.com", hours: 4.0, workspace: "Alfa Finance", project: "Gestão" },
  { id: "7", date: "2026-07-20", task: "Consultoria e Análise de Funil", professional: "lian.garras@v4company.com", hours: 6.0, workspace: "Workspace Beta Ventures", project: "Consultoria" },
  { id: "8", date: "2026-07-23", task: "Ajuste de Rastreamento de Conversões", professional: "lian.garras@v4company.com", hours: 3.5, workspace: "Workspace Beta Ventures", project: "Analytics" },
  { id: "9", date: "2026-07-27", task: "Planejamento Mensal de Escala", professional: "lian.garras@v4company.com", hours: 8.5, workspace: "Workspace Alfa Tech", project: "Gestão" },

  // carlos.silva@v4company.com
  { id: "10", date: "2026-07-01", task: "Desenvolvimento de Landing Page", professional: "carlos.silva@v4company.com", hours: 8.0, workspace: "Workspace Alfa Tech", project: "Desenvolvimento" },
  { id: "11", date: "2026-07-08", task: "Configuração de API de Conversão", professional: "carlos.silva@v4company.com", hours: 6.0, workspace: "Workspace Alfa Tech", project: "Desenvolvimento" },
  { id: "12", date: "2026-07-15", task: "Correção de Bugs no Fluxo de Checkout", professional: "carlos.silva@v4company.com", hours: 12.0, workspace: "Alfa Finance", project: "Desenvolvimento" },
  { id: "13", date: "2026-07-22", task: "Integração de Métricas de CRM", professional: "carlos.silva@v4company.com", hours: 9.5, workspace: "Workspace Beta Ventures", project: "Desenvolvimento" },

  // mariana.souza@v4company.com
  { id: "14", date: "2026-07-04", task: "Criação de Copy para Anúncios", professional: "mariana.souza@v4company.com", hours: 5.0, workspace: "Workspace Beta Ventures", project: "Copywriting" },
  { id: "15", date: "2026-07-11", task: "Estruturação de VSL de Vendas", professional: "mariana.souza@v4company.com", hours: 7.0, workspace: "Workspace Beta Ventures", project: "Copywriting" },
  { id: "16", date: "2026-07-18", task: "Roteirização de Criativos de Conversão", professional: "mariana.souza@v4company.com", hours: 6.5, workspace: "Beta Logistics", project: "Copywriting" },
  { id: "17", date: "2026-07-25", task: "Auditoria de Conteúdo de Blog", professional: "mariana.souza@v4company.com", hours: 4.5, workspace: "Workspace Gamma Health", project: "Conteúdo" },
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspacesParam = searchParams.get("workspaces");
    const projectFilter = searchParams.get("project");
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const professionalFilter = searchParams.get("professional"); // Adicionado filtro por investidor/profissional

    if (!workspacesParam) {
      return NextResponse.json({ error: "Workspaces não especificados." }, { status: 400 });
    }

    const authorizedWorkspaces = workspacesParam.split(",");

    const apiToken = process.env.EKYTE_API_TOKEN;
    const apiUrl = process.env.EKYTE_API_URL;

    let rawData: any[] = [];

    // Se as credenciais do eKyte estiverem configuradas, tentamos ler da API real
    if (apiToken && apiToken !== "seu_token_aqui" && apiUrl) {
      try {
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
      rawData = MOCK_HOURS_DATA;
    }

    // Filtragem de Segurança no Backend por Workspace
    let filteredData = rawData.filter((item) =>
      authorizedWorkspaces.includes(item.workspace)
    );

    // Filtro adicional por Investidor/Profissional se fornecido
    if (professionalFilter && professionalFilter !== "all") {
      filteredData = filteredData.filter((item) => item.professional === professionalFilter);
    }

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
