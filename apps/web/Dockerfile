# syntax=docker/dockerfile:1

FROM node:24-alpine AS base

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

# ---------------------------------------------------------------------------
# dev: servidor de desenvolvimento do Next; o código vem por bind mount e
# node_modules/.next por volumes nomeados (ver docker-compose.dev.yaml)
# ---------------------------------------------------------------------------
FROM base AS dev

ARG user=node-dev
ARG uid=1000

COPY docker/entrypoint.dev.sh /usr/local/bin/entrypoint.dev.sh

# Usuário com o mesmo UID do host: arquivos criados no bind mount ficam com o dono certo.
# O diretório dos volumes nomeados é criado já com esse dono (o volume herda o dono).
RUN chmod +x /usr/local/bin/entrypoint.dev.sh \
    && (deluser node 2>/dev/null || true) \
    && adduser -D -u ${uid} ${user} \
    && mkdir -p /app/node_modules /app/.next \
    && chown -R ${user} /app
USER ${user}

EXPOSE 3000
ENTRYPOINT ["entrypoint.dev.sh"]
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0"]
