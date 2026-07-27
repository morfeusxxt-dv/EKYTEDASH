import { NextResponse } from "next/server";

const MOCK_USERS = [
  { email: "lian.garras@v4company.com", name: "Lian Garras" },
  { email: "carlos.silva@v4company.com", name: "Carlos Silva" },
  { email: "mariana.souza@v4company.com", name: "Mariana Souza" },
];

export async function GET() {
  try {
    const apiToken = process.env.EKYTE_API_TOKEN;
    const apiUrl = process.env.EKYTE_API_URL;

    // Se não estiver configurado, retorna os mocks
    if (!apiToken || apiToken === "seu_token_aqui" || !apiUrl) {
      return NextResponse.json({ data: MOCK_USERS });
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

    if (response.ok) {
      const resJson = await response.json();
      const rawText = resJson.result?.content?.[0]?.text;
      if (rawText) {
        const usersList = JSON.parse(rawText);
        // Filtra apenas usuários que possuem email e remove duplicatas
        const mappedUsers = usersList
          .filter((u: any) => u.email)
          .map((u: any) => ({
            email: u.email,
            name: u.userName || u.email.split("@")[0]
          }))
          .sort((a: any, b: any) => a.email.localeCompare(b.email));
        return NextResponse.json({ data: mappedUsers });
      }
    }

    // Em caso de erro na API do MCP, retorna os dados de mock como segurança
    console.warn("Erro ao ler list_all_users_with_profile do MCP. Usando fallback.");
    return NextResponse.json({ data: MOCK_USERS });
  } catch (error: any) {
    console.error("Erro na rota /api/users:", error);
    return NextResponse.json({ data: MOCK_USERS });
  }
}
