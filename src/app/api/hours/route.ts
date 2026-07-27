import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectFilter = searchParams.get("project");
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const professionalFilter = searchParams.get("professional");

    const apiToken = process.env.EKYTE_API_TOKEN;
    const apiUrl = process.env.EKYTE_API_URL;

    // Se as credenciais do eKyte não estiverem configuradas no ambiente
    if (!apiToken || apiToken === "seu_token_aqui" || !apiUrl) {
      return NextResponse.json({
        error: "Credenciais da API do eKyte não configuradas. Preencha EKYTE_API_TOKEN e EKYTE_API_URL.",
        debugInfo: { apiTokenSet: !!apiToken, apiUrlSet: !!apiUrl }
      }, { status: 400 });
    }

    // Faz a chamada ao Servidor MCP do eKyte via JSON-RPC
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

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({
        error: `O Servidor MCP do eKyte retornou erro: ${response.status}`,
        details: errText
      }, { status: response.status });
    }

    const resJson = await response.json();

    // Tratamento de erro do próprio JSON-RPC
    if (resJson.error) {
      return NextResponse.json({
        error: "O eKyte MCP retornou um erro interno no processamento do JSON-RPC.",
        details: resJson.error
      }, { status: 400 });
    }

    const rawText = resJson.result?.content?.[0]?.text;
    if (!rawText) {
      return NextResponse.json({
        error: "Nenhum dado retornado no payload do eKyte MCP.",
        response: resJson
      }, { status: 404 });
    }

    const list = JSON.parse(rawText);

    // Mapeia o payload oficial do eKyte para o formato do Frontend
    let rawData = list.map((item: any) => ({
      id: String(item.id),
      date: item.startDate ? item.startDate.split("T")[0] : "",
      task: item.ctcTask?.title || item.comment || "Atividade Operacional",
      professional: item.executor?.email || item.createdBy?.email || "Desconhecido",
      hours: (item.effort || 0) / 60,
      workspace: item.workspace?.name || "Geral",
      project: item.ctcTaskType?.name || "Outros"
    }));

    // Filtra pelo Profissional/Investidor selecionado (e-mail)
    if (professionalFilter && professionalFilter !== "all") {
      rawData = rawData.filter((item: any) => item.professional === professionalFilter);
    }

    // Filtro adicional por Projeto se fornecido
    if (projectFilter && projectFilter !== "Todos" && projectFilter !== "all") {
      rawData = rawData.filter((item: any) => item.project === projectFilter);
    }

    // Filtro adicional por período
    if (startDateParam && endDateParam) {
      const start = new Date(startDateParam);
      const end = new Date(endDateParam);
      rawData = rawData.filter((item: any) => {
        const itemDate = new Date(item.date);
        return itemDate >= start && itemDate <= end;
      });
    }

    return NextResponse.json({ data: rawData });
  } catch (error: any) {
    console.error("Erro na rota /api/hours:", error);
    return NextResponse.json({
      error: "Erro interno no servidor ao consultar o eKyte.",
      details: error.message
    }, { status: 500 });
  }
}
