"use client";

import { useRef, useState, type FormEvent } from "react";
import styles from "./page.module.css";
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
      <form className={styles.form} onSubmit={enviar}>
        <label htmlFor="texto" className={styles.rotulo}>
          Texto para analisar
        </label>
        <textarea
          id="texto"
          className={styles.campo}
          rows={10}
          value={texto}
          disabled={carregando}
          aria-describedby="contador"
          onChange={(evento) => {
            setTexto(evento.target.value);
            setErro(null);
          }}
        />
        <div className={styles.rodape}>
          <span
            id="contador"
            className={acimaDoLimite ? styles.contadorExcedido : styles.contador}
          >
            {formatarNumero.format(tamanho)} /{" "}
            {formatarNumero.format(LIMITE_CARACTERES)}
          </span>
          <button
            type="submit"
            className={styles.botao}
            disabled={carregando}
            aria-busy={carregando}
          >
            {carregando ? "Processando com IA..." : "Analisar Dados"}
          </button>
        </div>
      </form>

      {erro && (
        <div role="alert" className={styles.erro}>
          {erro}
        </div>
      )}

      {analise && (
        <section className={styles.resultado} aria-label="Resultado da análise">
          <h2>Resumo</h2>
          <p className={styles.textoPreservado}>{analise.resumo}</p>

          <h2>Pontos principais</h2>
          <ul>
            {analise.pontos_principais.map((ponto, indice) => (
              <li key={indice} className={styles.textoPreservado}>
                {ponto}
              </li>
            ))}
          </ul>

          <h2>Planos de ação</h2>
          <ul>
            {analise.planos_de_acao.map((plano, indice) => (
              <li key={indice} className={styles.textoPreservado}>
                {plano}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
