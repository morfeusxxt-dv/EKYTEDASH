import { NextResponse } from "next/server";

export async function GET() {
  try {
    const apiToken = process.env.EKYTE_API_TOKEN;
    const apiUrl = process.env.EKYTE_API_URL;

    // Se não estiver configurado, retorna erro explicativo
    if (!apiToken || apiToken === "seu_token_aqui" || !apiUrl) {
      return NextResponse.json({ 
        error: "Credenciais do eKyte não configuradas nas variáveis de ambiente." 
      }, { status: 400 });
    }

    // Chamada MCP para listar todos os usuários da empresa
    const response = await fetch(`${apiUrl}/mcp?token=${apiToken}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "list_all_users_with_profile",
          arguments: {}
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

    if (resJson.error) {
      return NextResponse.json({
        error: "Erro do eKyte MCP ao listar usuários com perfil.",
        details: resJson.error
      }, { status: 400 });
    }

    const rawText = resJson.result?.content?.[0]?.text;
    if (!rawText) {
      return NextResponse.json({
        error: "Nenhum usuário retornado no payload do eKyte MCP."
      }, { status: 404 });
    }

    const usersList = JSON.parse(rawText);
    // Mapeia os usuários mantendo o ID interno do eKyte para consultas de esforço
    const mappedUsers = usersList
      .filter((u: any) => u.email)
      .map((u: any) => ({
        id: u.id,
        email: u.email,
        name: u.userName || u.email.split("@")[0]
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
