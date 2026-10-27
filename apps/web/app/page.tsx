import Analisador from "./analisador";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.main}>
      <h1>Análise de dados com IA</h1>
      <p className={styles.intro}>
        Cole um texto e receba um resumo, os pontos principais e planos de ação.
      </p>
      <Analisador />
    </main>
  );
}
