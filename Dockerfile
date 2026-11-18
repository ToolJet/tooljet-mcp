# bundle/index.js is a committed esbuild bundle (all deps inlined) — no build step, no node_modules.
# package.json is still required at runtime: it declares "type": "module", which the bundle's
# top-level `import` statements need (bundle/index.js has no .mjs extension of its own).

# Code mode runs the ToolJet CLI, the custom component SDK and the app security scanner. All three ship inside the
# ToolJet server image (EE/Cloud) and must be the versions that server runs, so they are copied from it:
#   docker build --build-arg TOOLJET_SERVER_IMAGE=tooljet/tj-osv:<server tag> .
# Without the arg the image builds as before, and Code mode tools report the CLI missing.
ARG TOOLJET_SERVER_IMAGE=no-code-mode
FROM busybox:1.37 AS no-code-mode
RUN mkdir -p /app/server/code-mode-cli /app/code-mode/custom-component-sdk /app/server/ee/packages/app-scanner
FROM ${TOOLJET_SERVER_IMAGE} AS tooljet-server

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

# Code mode: the server's CLI (installed globally as `tooljet`), its SDK and its scanner.
COPY --from=tooljet-server /app/server/code-mode-cli /opt/code-mode/cli
COPY --from=tooljet-server --chown=node:node /app/code-mode/custom-component-sdk /opt/code-mode/custom-component-sdk
COPY --from=tooljet-server --chown=node:node /app/server/ee/packages/app-scanner /opt/code-mode/app-scanner
RUN if [ -f /opt/code-mode/cli/tooljet-cli.tgz ]; then \
      npm install -g /opt/code-mode/cli/tooljet-cli.tgz && npm cache clean --force; \
    fi
ENV TOOLJET_SDK_SPEC=file:/opt/code-mode/custom-component-sdk \
    TOOLJET_APP_SCANNER_BIN=/opt/code-mode/app-scanner/bin/tj-app-scan.js

WORKDIR /app
COPY --chown=node:node package.json ./
COPY --chown=node:node bundle/ ./bundle/
COPY --chown=node:node data/ ./data/
USER node

# This minimal image has no Playwright/Chrome; omit the render tool and use manual checks.
ENV MCP_RENDER_AUDIT_ENABLED=false
ENV MCP_TRANSPORT=http
ENV PORT=8787
EXPOSE 8787

CMD ["node", "bundle/index.js"]
