# bundle/index.js is a committed esbuild bundle (all deps inlined) — no build step, no node_modules.
# package.json is still required at runtime: it declares "type": "module", which the bundle's
# top-level `import` statements need (bundle/index.js has no .mjs extension of its own).

# Code mode runs the ToolJet CLI, the custom component SDK and the app security scanner, built here the way the
# ToolJet server image builds them (docker/LTS/cloud/cloud-server.Dockerfile). The scanner (ee-server) and the SDK are
# private, so the build needs a GitHub token that can read ToolJet, ee-server and custom-component-sdk:
#   docker build --secret id=github_token,env=GITHUB_TOKEN --build-arg TOOLJET_BRANCH=main .
# The token is a BuildKit secret, so it stays out of the layers, the image config and the build provenance.
# TOOLJET_BRANCH should be the branch the ToolJet server was built from: the server scans the app again on save.
FROM node:22 AS code-mode
ARG TOOLJET_BRANCH=main
ARG CUSTOM_COMPONENT_SDK_REF=main
WORKDIR /src
# ee-server: the same branch if it has one, else the branch ToolJet's .gitmodules tracks, as the server build does.
RUN --mount=type=secret,id=github_token,required=true \
    TOKEN=$(cat /run/secrets/github_token) && \
    export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0="url.https://x-access-token:${TOKEN}@github.com/.insteadOf" GIT_CONFIG_VALUE_0="https://github.com/" && \
    git clone --depth 1 --filter=blob:none --sparse --branch "$TOOLJET_BRANCH" https://github.com/ToolJet/ToolJet.git tooljet && \
    git -C tooljet sparse-checkout set cli server/scripts && \
    if git ls-remote --exit-code --heads https://github.com/ToolJet/ee-server.git "$TOOLJET_BRANCH" >/dev/null; then \
      EE_BRANCH="$TOOLJET_BRANCH"; \
    else \
      EE_BRANCH=$(git config -f tooljet/.gitmodules submodule.server/ee.branch); \
    fi && \
    echo "ToolJet $TOOLJET_BRANCH, ee-server $EE_BRANCH, SDK $CUSTOM_COMPONENT_SDK_REF" && \
    git clone --depth 1 --branch "$EE_BRANCH" https://github.com/ToolJet/ee-server.git tooljet/server/ee && \
    git clone https://github.com/ToolJet/custom-component-sdk.git sdk && \
    git -C sdk checkout --detach "$CUSTOM_COMPONENT_SDK_REF"
# CLI packed as the server packs it, the SDK unpacked for TOOLJET_SDK_SPEC, the scanner with its runtime dependencies.
RUN npm --prefix tooljet/cli ci --include=dev && npm --prefix tooljet/cli run build && bash tooljet/server/scripts/pack-cli.sh && \
    mkdir -p /out/cli /out/custom-component-sdk && mv tooljet/server/code-mode-cli/tooljet-cli.tgz /out/cli/ && \
    cd sdk && npm ci && npm run build && \
    tar -xzf "$(npm pack --ignore-scripts --silent | tail -n 1)" -C /out/custom-component-sdk --strip-components=1 && \
    cd .. && npm --prefix tooljet/server/ee/packages/app-scanner ci --omit=dev && \
    mv tooljet/server/ee/packages/app-scanner /out/app-scanner

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

# Code mode: the CLI (installed globally as `tooljet`), the SDK and the scanner built above.
COPY --from=code-mode /out/cli /opt/code-mode/cli
COPY --from=code-mode --chown=node:node /out/custom-component-sdk /opt/code-mode/custom-component-sdk
COPY --from=code-mode --chown=node:node /out/app-scanner /opt/code-mode/app-scanner
RUN npm install -g /opt/code-mode/cli/tooljet-cli.tgz && npm cache clean --force && tooljet --version
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
