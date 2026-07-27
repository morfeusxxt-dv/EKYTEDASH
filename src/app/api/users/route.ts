import { NextResponse } from "next/server";

export async function GET() {
  try {
    const apiToken = process.env.EKYTE_API_TOKEN;
    const apiUrl = process.env.EKYTE_API_URL || "https://api.ekyte.com";
    const companyId = process.env.EKYTE_COMPANY_ID || "9396";

    if (!apiToken || apiToken === "seu_token_aqui") {
      return NextResponse.json({ 
        error: "Credenciais do eKyte não configuradas nas variáveis de ambiente. Defina EKYTE_API_TOKEN." 
      }, { status: 400 });
    }

    // Consulta direta à API REST nativa do eKyte v1.0
    const response = await fetch(`${apiUrl}/v1.0/users?apiKey=${apiToken}&companyId=${companyId}`);

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({
        error: `A API do eKyte retornou erro ao listar usuários: ${response.status}`,
        details: errText
      }, { status: response.status });
    }

    const resJson = await response.json();

    if (resJson.error) {
      return NextResponse.json({
        error: "Erro retornado pela API do eKyte ao consultar usuários.",
        details: resJson.error
      }, { status: 400 });
    }

    const usersList = resJson.data || [];
    const mappedUsers = usersList
      .filter((u: any) => u.email)
      .map((u: any) => ({
        id: u.id,
        email: u.email,
        name: u.username || u.name || u.email.split("@")[0]
      }))
      .sort((a: any, b: any) => a.email.localeCompare(b.email));

    return NextResponse.json({ data: mappedUsers });
  } catch (error: any) {
    console.error("Erro na rota /api/users:", error);
    return NextResponse.json({
      error: "Erro interno no servidor ao listar usuários.",
      details: error.message
    }, { status: 500 });
  }
}
