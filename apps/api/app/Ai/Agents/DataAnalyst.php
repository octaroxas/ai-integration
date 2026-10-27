<?php

namespace App\Ai\Agents;

use App\Ai\Enums\TipoDeFalha;
use App\Ai\Exceptions\AnaliseFalhouException;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Log;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Contracts\HasStructuredOutput;
use Laravel\Ai\Exceptions\InsufficientCreditsException;
use Laravel\Ai\Exceptions\ProviderConnectionException;
use Laravel\Ai\Exceptions\RateLimitedException;
use Laravel\Ai\Promptable;
use Stringable;
use Throwable;

class DataAnalyst implements Agent, HasStructuredOutput
{
    use Promptable;

    /**
     * Get the instructions that the agent should follow.
     */
    public function instructions(): Stringable|string
    {
        return <<<'TXT'
        Você é um analista de dados. Analise o conteúdo que o usuário enviar (dados, relatórios ou
        anotações) e responda sempre em português do Brasil, de forma objetiva.

        Devolva:
        - um resumo curto do conteúdo;
        - os pontos principais, cada um em uma frase;
        - planos de ação concretos e acionáveis, cada um em uma frase.

        Baseie-se somente no conteúdo recebido, sem inventar informações.
        TXT;
    }

    /**
     * Get the agent's structured output schema definition.
     */
    public function schema(JsonSchema $schema): array
    {
        return [
            'resumo' => $schema->string()->min(1)->required(),
            'pontos_principais' => $schema->array()->items($schema->string()->min(1))->min(1)->required(),
            'planos_de_acao' => $schema->array()->items($schema->string()->min(1))->min(1)->required(),
        ];
    }

    /**
     * Analisa o texto com o modelo de IA configurado.
     *
     * @return array{resumo: string, pontos_principais: list<string>, planos_de_acao: list<string>}
     */
    public function analisar(string $conteudo): array
    {
        if (trim($conteudo) === '') {
            throw new AnaliseFalhouException(TipoDeFalha::EntradaVazia);
        }

        $provedor = config('ai.default');

        if (blank(config("ai.providers.{$provedor}.key"))) {
            throw new AnaliseFalhouException(TipoDeFalha::ConfiguracaoAusente);
        }

        try {
            $resposta = $this->prompt($conteudo)->toArray();
        } catch (Throwable $e) {
            $tipo = $this->tipoDaFalha($e);

            // Só o tipo vai para o log: a mensagem do provedor pode trazer detalhes internos.
            Log::warning('Falha ao analisar com o provedor de IA.', ['tipo' => $tipo->value]);

            throw new AnaliseFalhouException($tipo);
        }

        $analise = [
            'resumo' => $resposta['resumo'] ?? null,
            'pontos_principais' => $resposta['pontos_principais'] ?? null,
            'planos_de_acao' => $resposta['planos_de_acao'] ?? null,
        ];

        if (! $this->analiseCompleta($analise)) {
            throw new AnaliseFalhouException(TipoDeFalha::RespostaVazia);
        }

        return $analise;
    }

    /**
     * A análise só vale com resumo e as duas listas preenchidos.
     */
    private function analiseCompleta(array $analise): bool
    {
        if (! is_string($analise['resumo']) || trim($analise['resumo']) === '') {
            return false;
        }

        foreach (['pontos_principais', 'planos_de_acao'] as $lista) {
            if (! is_array($analise[$lista]) || array_filter($analise[$lista], fn ($item) => is_string($item) && trim($item) !== '') === []) {
                return false;
            }
        }

        return true;
    }

    /**
     * Traduz a exceção do SDK/HTTP para o tipo de falha tratada.
     */
    private function tipoDaFalha(Throwable $e): TipoDeFalha
    {
        if ($e instanceof RateLimitedException || $e instanceof InsufficientCreditsException) {
            return TipoDeFalha::LimiteDeUso;
        }

        if ($e instanceof ProviderConnectionException || $e instanceof ConnectionException) {
            return TipoDeFalha::TempoEsgotado;
        }

        if ($e instanceof RequestException) {
            $status = $e->response?->status();
            // O Gemini responde 400 com reason API_KEY_INVALID (ou similar) para chave inválida;
            // o erro vem em `error` ou embrulhado numa lista (`0.error`).
            $erro = $e->response?->json('error') ?? $e->response?->json('0.error') ?? [];
            $motivos = collect($erro['details'] ?? [])->pluck('reason')->filter()->implode(' ');

            if (in_array($status, [401, 403], true) || str_contains($motivos, 'API_KEY')) {
                return TipoDeFalha::Autenticacao;
            }

            if ($status === 404) {
                return TipoDeFalha::ModeloInvalido;
            }
        }

        return TipoDeFalha::Indisponivel;
    }
}
