# bundle/index.js is a committed esbuild bundle (all deps inlined) — no build step, no node_modules.
# package.json is still required at runtime: it declares "type": "module", which the bundle's
# top-level `import` statements need (bundle/index.js has no .mjs extension of its own).
FROM node:22-slim
WORKDIR /app
COPY --chown=node:node package.json ./
COPY --chown=node:node bundle/ ./bundle/
COPY --chown=node:node data/ ./data/
USER node

ENV MCP_TRANSPORT=http
ENV PORT=8787
EXPOSE 8787

CMD ["node", "bundle/index.js"]
