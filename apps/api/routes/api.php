<?php

use App\Http\Controllers\ProcessarDadosController;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => response()->json(['status' => 'ok']));

Route::post('/processar-dados', ProcessarDadosController::class);
