# bundle/index.js is a committed esbuild bundle (all deps inlined) — no build step, no node_modules.
# package.json is still required at runtime: it declares "type": "module", which the bundle's
# top-level `import` statements need (bundle/index.js has no .mjs extension of its own).
FROM node:22-slim
# Headless Chromium + playwright-core for the post-build render audit (build-plugin.mjs keeps
# playwright-core external, so it is installed here rather than bundled).
RUN apt-get update \
 && apt-get install -y --no-install-recommends chromium fonts-liberation fonts-noto-color-emoji \
 && rm -rf /var/lib/apt/lists/*
RUN mkdir -p /opt/render-audit && cd /opt/render-audit \
 && npm init -y >/dev/null && npm install --omit=dev playwright-core@1.63.0
ENV MCP_RENDER_AUDIT_PLAYWRIGHT=/opt/render-audit/node_modules/playwright-core \
    MCP_RENDER_AUDIT_CHROME=/usr/bin/chromium
WORKDIR /app
COPY --chown=node:node package.json ./
COPY --chown=node:node bundle/ ./bundle/
COPY --chown=node:node data/ ./data/
USER node

ENV MCP_TRANSPORT=http
ENV PORT=8787
EXPOSE 8787

CMD ["node", "bundle/index.js"]
