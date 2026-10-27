<?php

namespace App\Ai\Enums;

enum TipoDeFalha: string
{
    case EntradaVazia = 'entrada_vazia';
    case ConfiguracaoAusente = 'configuracao_ausente';
    case Autenticacao = 'autenticacao';
    case LimiteDeUso = 'limite_de_uso';
    case TempoEsgotado = 'tempo_esgotado';
    case ModeloInvalido = 'modelo_invalido';
    case RespostaVazia = 'resposta_vazia';
    case Indisponivel = 'indisponivel';

    /**
     * Mensagem fixa, em português, própria para o usuário final e sem detalhes internos.
     */
    public function mensagem(): string
    {
        return match ($this) {
            self::EntradaVazia => 'Informe um texto para analisar.',
            self::ConfiguracaoAusente => 'A chave do provedor de IA não está configurada.',
            self::Autenticacao => 'A chave do provedor de IA é inválida ou não tem permissão.',
            self::LimiteDeUso => 'O limite de uso do provedor de IA foi atingido. Tente novamente mais tarde.',
            self::TempoEsgotado => 'O provedor de IA demorou demais para responder ou não respondeu.',
            self::ModeloInvalido => 'O modelo de IA configurado não está disponível.',
            self::RespostaVazia => 'O provedor de IA devolveu uma resposta vazia ou incompleta.',
            self::Indisponivel => 'O provedor de IA está temporariamente indisponível.',
        };
    }
}
