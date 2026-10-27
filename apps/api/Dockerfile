# syntax=docker/dockerfile:1

FROM php:8.4-cli-alpine AS base

RUN apk add --no-cache \
        postgresql-dev \
        icu-dev \
        oniguruma-dev \
        libzip-dev \
        $PHPIZE_DEPS \
    && docker-php-ext-install pdo_pgsql pgsql intl mbstring bcmath opcache zip \
    && apk del $PHPIZE_DEPS

WORKDIR /var/www/html

# ---------------------------------------------------------------------------
# dev: composer install completo (com dev deps), roda `php artisan serve`;
# o código vem por bind mount (ver docker-compose.dev.yaml)
# ---------------------------------------------------------------------------
FROM base AS dev

ARG user=laravel
ARG uid=1000

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
COPY docker/entrypoint.dev.sh /usr/local/bin/entrypoint.dev.sh
RUN chmod +x /usr/local/bin/entrypoint.dev.sh

# Usuário com o mesmo UID do host: arquivos criados no bind mount ficam com o dono certo.
RUN adduser -D -u ${uid} ${user} \
    && mkdir -p /home/${user}/.composer \
    && chown -R ${user}:${user} /home/${user}
USER ${user}

EXPOSE 8000
ENTRYPOINT ["entrypoint.dev.sh"]
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
