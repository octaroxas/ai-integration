export type Analise = {
  resumo: string;
  pontos_principais: string[];
  planos_de_acao: string[];
};

export const LIMITE_CARACTERES = 10000;

const TEMPO_LIMITE_MS = 60_000;

const MENSAGEM_FORMATO = "A resposta do servidor veio em um formato inesperado.";

export class ErroDeAnalise extends Error {}

export function validarTexto(texto: string): string | null {
  if (texto.trim() === "") {
    return "Informe um texto para analisar.";
  }
  // Conta por pontos de código, como a API conta caracteres (não unidades UTF-16).
  if ([...texto].length > LIMITE_CARACTERES) {
    return `O texto deve ter no máximo ${LIMITE_CARACTERES} caracteres.`;
  }
  return null;
}

function listaDeTextos(valor: unknown): valor is string[] {
  return (
    Array.isArray(valor) &&
    valor.length > 0 &&
    valor.every((item) => typeof item === "string")
  );
}

function ehAnalise(valor: unknown): valor is Analise {
  if (typeof valor !== "object" || valor === null) return false;
  const { resumo, pontos_principais, planos_de_acao } = valor as Record<
    string,
    unknown
  >;
  return (
    typeof resumo === "string" &&
    resumo.trim() !== "" &&
    listaDeTextos(pontos_principais) &&
    listaDeTextos(planos_de_acao)
  );
}

function textoNaoVazio(valor: unknown): string | null {
  return typeof valor === "string" && valor.trim() !== "" ? valor : null;
}

function mensagemDeErro(corpo: unknown): string | null {
  if (typeof corpo !== "object" || corpo === null) return null;
  const { mensagem, erros } = corpo as Record<string, unknown>;
  const conteudo =
    typeof erros === "object" && erros !== null
      ? (erros as Record<string, unknown>).conteudo
      : undefined;
  return (
    textoNaoVazio(Array.isArray(conteudo) ? conteudo[0] : undefined) ??
    textoNaoVazio(mensagem)
  );
}

export async function analisarTexto(conteudo: string): Promise<Analise> {
  const urlBase = process.env.NEXT_PUBLIC_API_URL;
  if (!urlBase) {
    throw new ErroDeAnalise("A URL da API não está configurada.");
  }

  let resposta: Response;
  try {
    resposta = await fetch(`${urlBase}/api/processar-dados`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ conteudo }),
      signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
    });
  } catch (erro) {
    if (erro instanceof DOMException && erro.name === "TimeoutError") {
      throw new ErroDeAnalise("A análise demorou demais. Tente novamente.");
    }
    throw new ErroDeAnalise(
      "Não foi possível falar com o servidor. Verifique se a API está no ar e tente novamente.",
    );
  }

  let corpo: unknown;
  try {
    corpo = await resposta.json();
  } catch {
    throw new ErroDeAnalise(MENSAGEM_FORMATO);
  }

  if (!resposta.ok) {
    throw new ErroDeAnalise(mensagemDeErro(corpo) ?? MENSAGEM_FORMATO);
  }

  const analise =
    typeof corpo === "object" && corpo !== null
      ? (corpo as Record<string, unknown>)
      : {};
  if (analise.sucesso !== true || !ehAnalise(analise.analise)) {
    throw new ErroDeAnalise(MENSAGEM_FORMATO);
  }
  return analise.analise;
}
