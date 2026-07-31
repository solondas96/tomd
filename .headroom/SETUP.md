# Headroom Setup for toMD Project

## Overview
Headroom is integrated to compress tokens sent to GitHub Copilot Pro and other LLMs, saving 15-20% on coding agent tokens and up to 60-95% on JSON data.

## Quick Start

### 1. Start the Headroom Proxy

```bash
cd /Users/solondas/Desktop/Projects/tomd
headroom proxy --port 8787
```

The proxy runs locally on `http://127.0.0.1:8787` and compresses all context before forwarding to your LLM provider.

### 2. For GitHub Copilot CLI Integration

```bash
# Authenticate with GitHub
headroom copilot-auth login

# Wrap your Copilot CLI to route through Headroom
headroom wrap copilot --subscription -- --model gpt-4o
```

### 3. Verify Compression is Working

```bash
# Health check
headroom doctor

# View live savings dashboard
headroom dashboard

# Check token reduction stats
headroom output-savings
```

## Expected Savings

- **Input tokens**: 15-20% reduction for coding
- **Output tokens**: ~32% reduction (trims verbose responses)
- **JSON/data**: 60-95% reduction

## Configuration

Current config: `.headroom/config.json`
- Mode: `cache` (compression mode)
- Backend: `anthropic` (configured for Anthropic Claude)
- Port: `8787`
- Telemetry: `off` (privacy-first)

## Features Available

✅ **Content Compression** — SmartCrusher for JSON, CodeCompressor for AST, Kompress-v2-base for prose  
✅ **Reversible Compression (CCR)** — Originals cached locally, retrievable on demand  
✅ **Cross-agent Memory** — Shared context across Claude, Copilot, and other agents  
✅ **Local Processing** — No data leaves your machine  
✅ **Output Shaping** — Reduces verbose model output tokens  

## Commands Reference

```bash
# Start proxy
headroom proxy --port 8787

# Start with dashboard
headroom dashboard

# Check health
headroom doctor

# View performance metrics
headroom perf

# Mine failed sessions and improve
headroom learn

# See token savings
headroom output-savings

# Update Headroom
headroom update
```

## Troubleshooting

If the proxy fails to start:
1. Check port 8787 is not in use: `lsof -i :8787`
2. Verify Python 3.10+ is installed: `python3 --version`
3. Reinstall if needed: `pip install --upgrade headroom-ai[all]`

## Documentation

- Full docs: https://headroom-docs.vercel.app/docs
- GitHub: https://github.com/headroomlabs-ai/headroom
- Discord: https://discord.gg/yRmaUNpsPJ
