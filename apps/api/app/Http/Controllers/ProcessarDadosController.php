<?php

namespace App\Http\Controllers;

use App\Ai\Agents\DataAnalyst;
use App\Http\Requests\ProcessarDadosRequest;
use Illuminate\Http\JsonResponse;

class ProcessarDadosController extends Controller
{
    /**
     * Repassa o texto ao agente de análise e devolve o resultado.
     */
    public function __invoke(ProcessarDadosRequest $request, DataAnalyst $analista): JsonResponse
    {
        $analise = $analista->analisar($request->validated('conteudo'));

        return response()->json(['sucesso' => true, 'analise' => $analise]);
    }
}
