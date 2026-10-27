<?php

use App\Ai\Enums\TipoDeFalha;
use App\Ai\Exceptions\AnaliseFalhouException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        //
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        // Todo erro de /api/* sai no envelope { sucesso: false, mensagem, erros? }.
        $exceptions->render(function (ValidationException $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            return response()->json([
                'sucesso' => false,
                'mensagem' => 'Os dados enviados são inválidos.',
                'erros' => $e->errors(),
            ], 422);
        });

        // O agente já registra o tipo da falha no log; o report() padrão gravaria o rastro.
        $exceptions->dontReport(AnaliseFalhouException::class);

        $exceptions->render(function (AnaliseFalhouException $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            $status = match ($e->tipo) {
                TipoDeFalha::EntradaVazia => 422,
                TipoDeFalha::LimiteDeUso, TipoDeFalha::ConfiguracaoAusente => 503,
                default => 502,
            };

            return response()->json(['sucesso' => false, 'mensagem' => $e->getMessage()], $status);
        });

        // Por último: 404/405 e afins com mensagem fixa; o resto vira 500 genérico. Nunca rastro,
        // nem com APP_DEBUG=true.
        $exceptions->render(function (Throwable $e, Request $request) {
            if (! $request->is('api/*') || $e instanceof ValidationException) {
                return null;
            }

            if ($e instanceof HttpExceptionInterface) {
                $status = $e->getStatusCode();
                $mensagem = match ($status) {
                    404 => 'Rota não encontrada.',
                    405 => 'Método não permitido.',
                    default => 'A requisição não pôde ser atendida.',
                };

                return response()->json(['sucesso' => false, 'mensagem' => $mensagem], $status, $e->getHeaders());
            }

            return response()->json([
                'sucesso' => false,
                'mensagem' => 'Ocorreu um erro inesperado. Tente novamente.',
            ], 500);
        });
    })->create();
