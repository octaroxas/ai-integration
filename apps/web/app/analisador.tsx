"use client";

import { useRef, useState, type FormEvent } from "react";
import {
  analisarTexto,
  ErroDeAnalise,
  LIMITE_CARACTERES,
  validarTexto,
  type Analise,
} from "./lib/api";

const formatarNumero = new Intl.NumberFormat("pt-BR");

export default function Analisador() {
  const [texto, setTexto] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [analise, setAnalise] = useState<Analise | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  // Fecha a janela entre dois eventos no mesmo tick, antes de `carregando` re-renderizar.
  const enviando = useRef(false);

  const tamanho = [...texto].length;
  const acimaDoLimite = tamanho > LIMITE_CARACTERES;

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando.current) return;

    setAnalise(null);
    setErro(null);

    const aviso = validarTexto(texto);
    if (aviso) {
      setErro(aviso);
      return;
    }

    enviando.current = true;
    setCarregando(true);
    try {
      setAnalise(await analisarTexto(texto));
    } catch (falha) {
      setErro(
        falha instanceof ErroDeAnalise
          ? falha.message
          : "Ocorreu um erro inesperado. Tente novamente.",
      );
    } finally {
      enviando.current = false;
      setCarregando(false);
    }
  }

  return (
    <>
      <form className="flex flex-col gap-2" onSubmit={enviar}>
        <label htmlFor="texto" className="font-semibold">
          Texto para analisar
        </label>
        <textarea
          id="texto"
          className="w-full resize-y rounded-lg border border-zinc-300 bg-transparent p-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-60 dark:border-zinc-700 dark:focus-visible:outline-blue-400"
          rows={10}
          value={texto}
          disabled={carregando}
          aria-describedby="contador"
          onChange={(evento) => {
            setTexto(evento.target.value);
            setErro(null);
          }}
        />
        <div className="flex items-center justify-between gap-4">
          <span
            id="contador"
            className={
              acimaDoLimite
                ? "text-sm font-semibold text-red-700 dark:text-red-400"
                : "text-sm text-zinc-600 dark:text-zinc-400"
            }
          >
            {formatarNumero.format(tamanho)} /{" "}
            {formatarNumero.format(LIMITE_CARACTERES)}
          </span>
          <button
            type="submit"
            className="cursor-pointer rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white hover:enabled:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-60 dark:focus-visible:outline-blue-400"
            disabled={carregando}
            aria-busy={carregando}
          >
            {carregando ? "Processando com IA..." : "Analisar Dados"}
          </button>
        </div>
      </form>

      {erro && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-red-600 bg-red-50 px-4 py-3 text-red-700 dark:border-red-500 dark:bg-red-950 dark:text-red-300"
        >
          {erro}
        </div>
      )}

      {analise && (
        <section className="mt-6" aria-label="Resultado da análise">
          <h2 className="mb-2 mt-5 text-lg font-semibold">Resumo</h2>
          <p className="whitespace-pre-wrap wrap-anywhere">{analise.resumo}</p>

          <h2 className="mb-2 mt-5 text-lg font-semibold">Pontos principais</h2>
          <ul className="list-disc pl-6">
            {analise.pontos_principais.map((ponto, indice) => (
              <li
                key={indice}
                className="whitespace-pre-wrap wrap-anywhere [&:not(:first-child)]:mt-1.5"
              >
                {ponto}
              </li>
            ))}
          </ul>

          <h2 className="mb-2 mt-5 text-lg font-semibold">Planos de ação</h2>
          <ul className="list-disc pl-6">
            {analise.planos_de_acao.map((plano, indice) => (
              <li
                key={indice}
                className="whitespace-pre-wrap wrap-anywhere [&:not(:first-child)]:mt-1.5"
              >
                {plano}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
