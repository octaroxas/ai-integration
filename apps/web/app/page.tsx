import Analisador from "./analisador";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-[720px] px-4 pb-16 pt-12">
      <h1 className="text-[28px] font-semibold tracking-tight">
        Análise de dados com IA
      </h1>
      <p className="mb-6 mt-2 text-zinc-600 dark:text-zinc-400">
        Cole um texto e receba um resumo, os pontos principais e planos de ação.
      </p>
      <Analisador />
    </main>
  );
}
