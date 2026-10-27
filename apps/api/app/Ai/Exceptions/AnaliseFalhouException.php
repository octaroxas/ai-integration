<?php

namespace App\Ai\Exceptions;

use App\Ai\Enums\TipoDeFalha;
use RuntimeException;

/**
 * Falha tratada da análise. Guarda só o tipo e uma mensagem fixa: nunca a exceção original
 * nem texto do provedor, para não vazar a chave, URLs ou respostas brutas.
 */
class AnaliseFalhouException extends RuntimeException
{
    public function __construct(public readonly TipoDeFalha $tipo)
    {
        parent::__construct($tipo->mensagem());
    }
}
