FROM node:24-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate && pnpm install --prod --frozen-lockfile
COPY apps ./apps
COPY backend ./backend
COPY data/vocabulario ./data/vocabulario
COPY data/demo ./data/demo
ENV HOST=0.0.0.0 PORT=8787
EXPOSE 8787
USER node
CMD ["node", "backend/demo.mjs"]
