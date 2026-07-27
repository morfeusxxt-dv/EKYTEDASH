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

    const tfhubApiUrl = process.env.TFHUB_API_URL || "http://localhost:8000";

    // 1. Busca a lista de usuários em paralelo para mapear executorId -> email e nome
    const usersRes = await fetch(`${apiUrl}/v1.0/users?apiKey=${apiToken}&companyId=${companyId}`);
    const usersEmailMap = new Map<string, string>(); // id -> email
    const usersNameMap  = new Map<string, string>(); // id -> name
    const usersSquadMap = new Map<string, string>(); // id -> squad
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

    const tfhubApiToken = process.env.TFHUB_API_TOKEN;

    // 1.5 Busca os clientes/resumo da API do TFHub para enriquecer squad e investidor
    const clientesSquadMap = new Map<string, string>(); // nome -> squad_nome
    const clientesInvestidorMap = new Map<string, string>(); // nome -> investidor_nome
    const clientesFeeMap = new Map<string, number>(); // nome -> fee
    try {
      const headers: Record<string, string> = {};
      if (tfhubApiToken) {
        headers["Authorization"] = `Bearer ${tfhubApiToken}`;
      }
      
      const clientesRes = await fetch(`${tfhubApiUrl}/api/clientes/resumo`, { headers });
      if (clientesRes.ok) {
        const clientesJson = await clientesRes.json();
        if (Array.isArray(clientesJson)) {
          clientesJson.forEach((c: any) => {
            if (c.nome) {
              if (c.squad_nome) clientesSquadMap.set(c.nome.toLowerCase(), c.squad_nome);
              if (c.investidor_nome) clientesInvestidorMap.set(c.nome.toLowerCase(), c.investidor_nome);
              const fee = c.fee || c.fee_mensal || c.valor || c.valor_fee || c.mensalidade || 0;
              if (fee) clientesFeeMap.set(c.nome.toLowerCase(), Number(fee));
            }
          });
        }
      } else {
        console.warn("TFHub API falhou ao retornar clientes:", clientesRes.status);
      }
    } catch (e) {
      console.warn("Erro ao chamar TFHub API:", e);
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

    // Faz a consulta direta de apontamentos na API REST usando paginação (limite de 500 por página)
    let list: any[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await fetch(`${apiUrl}/v1.0/time-trackings?${queryParams.toString()}&page=${page}`);
      
      if (!response.ok) {
        if (page === 1) {
          const errText = await response.text();
          return NextResponse.json({
            error: `A API de apontamentos do eKyte retornou erro: ${response.status}`,
            details: errText
          }, { status: response.status });
        }
        break;
      }

      const resJson = await response.json();
      if (resJson.error) {
        if (page === 1) {
          return NextResponse.json({
            error: "A API do eKyte retornou um erro interno ao ler os apontamentos.",
            details: resJson.error
          }, { status: 400 });
        }
        break;
      }

      const data = resJson.data || [];
      list = list.concat(data);

      if (data.length < 500) {
        hasMore = false;
      } else {
        page++;
      }
      
      if (page > 50) break; // Limite de segurança de 25000 registros (50 páginas)
    }

    // Mapeamento de índice -> nome do dia em pt-BR
    const DIAS: Record<number, string> = {
      0: "Domingo", 1: "Segunda", 2: "Terça", 3: "Quarta",
      4: "Quinta", 5: "Sexta", 6: "Sábado"
    };

    // Mapeia o payload da API REST do eKyte para o formato esperado pelo Frontend
    let rawData = list.map((item: any) => {
      const email = usersEmailMap.get(item.executorId) || "Desconhecido";
      const name  = usersNameMap.get(item.executorId)  || email;

      // Detecta workspace interno pelo nome
      const workspaceName = item.workspace || "Geral";
      const interno = /INTERNO/i.test(workspaceName);
      
      const wsLower = workspaceName.toLowerCase();
      const squad = clientesSquadMap.get(wsLower) || "Sem Squad";
      const investidor = clientesInvestidorMap.get(wsLower) || "Sem Investidor";
      const fee = clientesFeeMap.get(wsLower) || 0;

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


      return {
        id: String(item.id),
        date: dateStr,
        task: item.ctcTask || item.comment || "Atividade Operacional",
        professional: email,       // e-mail para filtros
        executor: name,            // nome amigável para exibição
        hours: (item.effort || 0) / 60,
        workspace: workspaceName,
        project: item.ctcTaskType || "Outros",
        squad,
        investidor,
        // Campos derivados para os gráficos V4
        diaSemana,
        diaSemanaIdx,
        horaInicio,
        interno,
        fee,
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

    // Filtro local pela data de execução (já que a API filtra pela criação - createdFrom)
    if (startDateParam || endDateParam) {
      rawData = rawData.filter((item: any) => {
        if (!item.date) return true;
        if (startDateParam && item.date < startDateParam) return false;
        if (endDateParam && item.date > endDateParam) return false;
        return true;
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
