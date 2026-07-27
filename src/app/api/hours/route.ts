import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectFilter = searchParams.get("project");
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const professionalFilter = searchParams.get("professional"); // E-mail
    const executorIdParam = searchParams.get("executorId"); // ID do eKyte

    const apiToken = process.env.EKYTE_API_TOKEN;
    const apiUrl = process.env.EKYTE_API_URL || "https://api.ekyte.com";
    const companyId = process.env.EKYTE_COMPANY_ID || "9396";

    // Se as credenciais do eKyte não estiverem configuradas no ambiente
    if (!apiToken || apiToken === "seu_token_aqui") {
      return NextResponse.json({
        error: "Credenciais da API do eKyte não configuradas. Preencha EKYTE_API_TOKEN nas configurações da Vercel.",
      }, { status: 400 });
    }

    // 1. Busca a lista de usuários em paralelo para mapear executorId -> email e nome
    const usersRes = await fetch(`${apiUrl}/v1.0/users?apiKey=${apiToken}&companyId=${companyId}`);
    const usersEmailMap = new Map<string, string>(); // id -> email
    const usersNameMap  = new Map<string, string>(); // id -> name
    if (usersRes.ok) {
      const usersJson = await usersRes.json();
      if (usersJson.data && Array.isArray(usersJson.data)) {
        usersJson.data.forEach((u: any) => {
          if (u.id) {
            if (u.email) usersEmailMap.set(u.id, u.email);
            const name = u.name || u.displayName || u.email || "Desconhecido";
            usersNameMap.set(u.id, name);
          }
        });
      }
    }

    // 2. Prepara a URL com query params da API REST do eKyte v1.0
    const queryParams = new URLSearchParams();
    queryParams.append("apiKey", apiToken);

    // Converte os filtros de período para createdFrom / createdTo recomendados pelo eKyte
    if (startDateParam) {
      queryParams.append("createdFrom", startDateParam);
    } else {
      queryParams.append("createdFrom", "2026-07-01");
    }

    if (endDateParam) {
      queryParams.append("createdTo", endDateParam);
    } else {
      queryParams.append("createdTo", "2026-07-31");
    }

    // Filtro direto por ID no eKyte se selecionado
    if (executorIdParam && executorIdParam !== "all") {
      queryParams.append("executorId", executorIdParam);
    }

    // Faz a consulta direta de apontamentos na API REST
    const response = await fetch(`${apiUrl}/v1.0/time-trackings?${queryParams.toString()}`);

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({
        error: `A API de apontamentos do eKyte retornou erro: ${response.status}`,
        details: errText
      }, { status: response.status });
    }

    const resJson = await response.json();

    if (resJson.error) {
      return NextResponse.json({
        error: "A API do eKyte retornou um erro interno ao ler os apontamentos.",
        details: resJson.error
      }, { status: 400 });
    }

    const list = resJson.data || [];

    // Mapeamento de índice -> nome do dia em pt-BR
    const DIAS: Record<number, string> = {
      0: "Domingo", 1: "Segunda", 2: "Terça", 3: "Quarta",
      4: "Quinta", 5: "Sexta", 6: "Sábado"
    };

    // Mapeia o payload da API REST do eKyte para o formato esperado pelo Frontend
    let rawData = list.map((item: any) => {
      const email = usersEmailMap.get(item.executorId) || "Desconhecido";
      const name  = usersNameMap.get(item.executorId)  || email;

      // Campos de data/hora derivados
      const dateStr = item.startDate ? item.startDate.split("T")[0] : "";
      let diaSemanaIdx = -1;
      let diaSemana = "—";
      let horaInicio = -1;

      if (item.startDate) {
        const d = new Date(item.startDate);
        diaSemanaIdx = d.getDay(); // 0=Dom, 1=Seg,...
        diaSemana = DIAS[diaSemanaIdx] ?? "—";
        horaInicio = d.getHours();
      } else if (dateStr) {
        const d = new Date(dateStr + "T12:00:00"); // noon fallback
        diaSemanaIdx = d.getDay();
        diaSemana = DIAS[diaSemanaIdx] ?? "—";
      }

      // Detecta workspace interno pelo nome
      const workspaceName = item.workspace || "Geral";
      const interno = /INTERNO/i.test(workspaceName);

      return {
        id: String(item.id),
        date: dateStr,
        task: item.ctcTask || item.comment || "Atividade Operacional",
        professional: email,       // e-mail para filtros
        executor: name,            // nome amigável para exibição
        hours: (item.effort || 0) / 60,
        workspace: workspaceName,
        project: item.ctcTaskType || "Outros",
        // Campos derivados para os gráficos V4
        diaSemana,
        diaSemanaIdx,
        horaInicio,
        interno,
      };
    });

    // Filtro redundante local de segurança pelo e-mail
    if (professionalFilter && professionalFilter !== "all") {
      rawData = rawData.filter((item: any) => item.professional === professionalFilter);
    }

    // Filtro adicional por Projeto se fornecido
    if (projectFilter && projectFilter !== "Todos" && projectFilter !== "all") {
      rawData = rawData.filter((item: any) => item.project === projectFilter);
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
