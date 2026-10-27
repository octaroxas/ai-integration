#!/bin/sh
set -e

if [ ! -f vendor/autoload.php ]; then
    composer install --no-interaction --no-progress
fi

if [ ! -f .env ]; then
    cp .env.example .env
    php artisan key:generate --no-interaction
fi

exec "$@"
