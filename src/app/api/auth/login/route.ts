import { NextResponse } from "next/server";

// Lista completa de todos os workspaces disponíveis no eKyte
const ALL_WORKSPACES = [
  "Workspace Alfa Tech",
  "Alfa Finance",
  "Workspace Beta Ventures",
  "Beta Logistics",
  "Workspace Gamma Health",
];

// Mock de Usuários
// Agora todos os usuários possuem acesso à lista completa de workspaces (ALL_WORKSPACES),
// permitindo que qualquer pessoa logada consiga ver e alternar entre quaisquer investidores e seus dados.
const MOCK_INVESTORS = [
  {
    username: "alfa@invest.com",
    password: "alfa123",
    name: "Investimentos Alfa S/A",
    role: "investor",
    workspaces: ALL_WORKSPACES,
  },
  {
    username: "beta@invest.com",
    password: "beta123",
    name: "Beta Ventures",
    role: "investor",
    workspaces: ALL_WORKSPACES,
  },
  {
    username: "admin@invest.com",
    password: "admin123",
    name: "Master Admin (Gestor)",
    role: "admin",
    workspaces: ALL_WORKSPACES,
  },
];

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    const matchedUser = MOCK_INVESTORS.find(
      (u) =>
        u.username.toLowerCase() === username.toLowerCase() &&
        u.password === password
    );

    if (matchedUser) {
      // Retorna os dados do usuário ocultando a senha
      const { password: _, ...userWithoutPassword } = matchedUser;
      return NextResponse.json({ user: userWithoutPassword });
    }

    return NextResponse.json(
      { error: "Usuário ou senha incorretos." },
      { status: 401 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
