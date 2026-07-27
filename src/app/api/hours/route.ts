import { NextResponse } from "next/server";

// Dataset simulado e realista para os apontamentos de horas.
// Este mock será retornado caso a API do eKyte não esteja configurada ou retorne erro.
const MOCK_HOURS_DATA = [
  { id: "1", date: "2026-07-02", task: "Setup Estratégico de Tráfego", professional: "lian.garras@v4company.com", hours: 6.5, workspace: "Workspace Alfa Tech", project: "Mídia Paga" },
  { id: "2", date: "2026-07-03", task: "Reunião de Alinhamento e OKR", professional: "lian.garras@v4company.com", hours: 2.0, workspace: "Workspace Alfa Tech", project: "Gestão" },
  { id: "3", date: "2026-07-06", task: "Análise de Dados de Conversão GA4", professional: "lian.garras@v4company.com", hours: 8.0, workspace: "Workspace Alfa Tech", project: "Analytics" },
  { id: "4", date: "2026-07-09", task: "Otimização de Públicos e Lances", professional: "lian.garras@v4company.com", hours: 5.5, workspace: "Workspace Alfa Tech", project: "Mídia Paga" },
  { id: "5", date: "2026-07-13", task: "Criação de Estrutura de Campanhas", professional: "lian.garras@v4company.com", hours: 10.0, workspace: "Alfa Finance", project: "Mídia Paga" },
  { id: "6", date: "2026-07-16", task: "Apresentação de Resultados de Tráfego", professional: "lian.garras@v4company.com", hours: 4.0, workspace: "Alfa Finance", project: "Gestão" },
  { id: "7", date: "2026-07-20", task: "Consultoria e Análise de Funil", professional: "lian.garras@v4company.com", hours: 6.0, workspace: "Workspace Beta Ventures", project: "Consultoria" },
  { id: "8", date: "2026-07-23", task: "Ajuste de Rastreamento de Conversões", professional: "lian.garras@v4company.com", hours: 3.5, workspace: "Workspace Beta Ventures", project: "Analytics" },
  { id: "9", date: "2026-07-27", task: "Planejamento Mensal de Escala", professional: "lian.garras@v4company.com", hours: 8.5, workspace: "Workspace Alfa Tech", project: "Gestão" },
  { id: "10", date: "2026-07-01", task: "Desenvolvimento de Landing Page", professional: "carlos.silva@v4company.com", hours: 8.0, workspace: "Workspace Alfa Tech", project: "Desenvolvimento" },
  { id: "11", date: "2026-07-08", task: "Configuração de API de Conversão", professional: "carlos.silva@v4company.com", hours: 6.0, workspace: "Workspace Alfa Tech", project: "Desenvolvimento" },
  { id: "12", date: "2026-07-15", task: "Correção de Bugs no Fluxo de Checkout", professional: "carlos.silva@v4company.com", hours: 12.0, workspace: "Alfa Finance", project: "Desenvolvimento" },
  { id: "13", date: "2026-07-22", task: "Integração de Métricas de CRM", professional: "carlos.silva@v4company.com", hours: 9.5, workspace: "Workspace Beta Ventures", project: "Desenvolvimento" },
  { id: "14", date: "2026-07-04", task: "Criação de Copy para Anúncios", professional: "mariana.souza@v4company.com", hours: 5.0, workspace: "Workspace Beta Ventures", project: "Copywriting" },
  { id: "15", date: "2026-07-11", task: "Estruturação de VSL de Vendas", professional: "mariana.souza@v4company.com", hours: 7.0, workspace: "Workspace Beta Ventures", project: "Copywriting" },
  { id: "16", date: "2026-07-18", task: "Roteirização de Criativos de Conversão", professional: "mariana.souza@v4company.com", hours: 6.5, workspace: "Beta Logistics", project: "Copywriting" },
  { id: "17", date: "2026-07-25", task: "Auditoria de Conteúdo de Blog", professional: "mariana.souza@v4company.com", hours: 4.5, workspace: "Workspace Gamma Health", project: "Conteúdo" },
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectFilter = searchParams.get("project");
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const professionalFilter = searchParams.get("professional");

    const apiToken = process.env.EKYTE_API_TOKEN;
    const apiUrl = process.env.EKYTE_API_URL;

    let rawData: any[] = [];

    // Conectando diretamente ao Servidor MCP do eKyte via chamada de ferramentas (JSON-RPC)
    if (apiToken && apiToken !== "seu_token_aqui" && apiUrl) {
      try {
        const response = await fetch(`${apiUrl}/mcp?token=${apiToken}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "tools/call",
            params: {
              name: "list_time_trackings",
              arguments: {
                startDate: startDateParam || "2026-07-01",
                endDate: endDateParam || "2026-07-31"
              }
            },
            id: 1
          })
        });

        if (response.ok) {
          const resJson = await response.json();
          const rawText = resJson.result?.content?.[0]?.text;
          if (rawText) {
            const list = JSON.parse(rawText);
            // Mapeia o payload oficial do eKyte para o formato simplificado do Frontend
            rawData = list.map((item: any) => ({
              id: String(item.id),
              date: item.startDate ? item.startDate.split("T")[0] : "",
              task: item.ctcTask?.title || item.comment || "Atividade Operacional",
              professional: item.executor?.email || item.createdBy?.email || "Desconhecido",
              hours: (item.effort || 0) / 60,
              workspace: item.workspace?.name || "Geral",
              project: item.ctcTaskType?.name || "Outros"
            }));
          } else {
            console.warn("MCP retornou conteúdo vazio, usando dados de fallback.");
            rawData = MOCK_HOURS_DATA;
          }
        } else {
          console.warn("Servidor MCP do eKyte retornou erro:", response.status, await response.text());
          rawData = MOCK_HOURS_DATA;
        }
      } catch (err) {
        console.error("Falha ao conectar no Servidor MCP do eKyte, usando dados de fallback:", err);
        rawData = MOCK_HOURS_DATA;
      }
    } else {
      rawData = MOCK_HOURS_DATA;
    }

    // Filtragem local dos dados retornados do eKyte
    let filteredData = rawData;

    // Filtra pelo Profissional/Investidor selecionado (e-mail)
    if (professionalFilter && professionalFilter !== "all") {
      filteredData = filteredData.filter((item) => item.professional === professionalFilter);
    }

    // Filtro adicional por Projeto/Campanha se fornecido
    if (projectFilter && projectFilter !== "Todos" && projectFilter !== "all") {
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
