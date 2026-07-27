import { NextResponse } from "next/server";

// Mock de Usuários / Investidores e seus respectivos Workspaces no eKyte
const MOCK_INVESTORS = [
  {
    username: "alfa@invest.com",
    password: "alfa123",
    name: "Investimentos Alfa S/A",
    role: "investor",
    workspaces: ["Workspace Alfa Tech", "Alfa Finance"],
  },
  {
    username: "beta@invest.com",
    password: "beta123",
    name: "Beta Ventures",
    role: "investor",
    workspaces: ["Workspace Beta Ventures", "Beta Logistics"],
  },
  {
    username: "admin@invest.com",
    password: "admin123",
    name: "Master Admin (Gestor)",
    role: "admin",
    workspaces: ["Workspace Alfa Tech", "Alfa Finance", "Workspace Beta Ventures", "Beta Logistics", "Workspace Gamma Health"],
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
