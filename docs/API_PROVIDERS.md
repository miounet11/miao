# API Providers Guide

Complete guide to configuring different LLM providers in Miaoda IDE.

## Table of Contents

- [OpenAI](#openai)
- [Anthropic](#anthropic)
- [Ollama (Local)](#ollama-local)
- [Azure OpenAI](#azure-openai)
- [Google AI](#google-ai)
- [DeepSeek](#deepseek)
- [Custom Providers](#custom-providers)

---

## OpenAI

### Overview

- **Provider**: OpenAI
- **Website**: https://openai.com
- **API Docs**: https://platform.openai.com/docs
- **Pricing**: https://openai.com/pricing

### Configuration

```json
{
  "provider": "openai",
  "apiUrl": "https://api.openai.com/v1",
  "apiKey": "sk-...",
  "model": "gpt-4"
}
```

### Available Models

| Model | Context Window | Best For |
|-------|----------------|----------|
| gpt-4 | 8K | Complex reasoning, code |
| gpt-4-turbo | 128K | Long context, analysis |
| gpt-4-vision | 128K | Image understanding |
| gpt-3.5-turbo | 16K | Fast, general tasks |

### Getting API Key

1. Go to https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Copy the key (starts with `sk-`)
4. Add to Miaoda IDE

### Tips

- Use `gpt-3.5-turbo` for fast responses
- Use `gpt-4` for complex reasoning
- Monitor usage at https://platform.openai.com/usage

---

## Anthropic

### Overview

- **Provider**: Anthropic
- **Website**: https://anthropic.com
- **API Docs**: https://docs.anthropic.com
- **Pricing**: https://anthropic.com/pricing

### Configuration

```json
{
  "provider": "anthropic",
  "apiUrl": "https://api.anthropic.com/v1",
  "apiKey": "sk-ant-...",
  "model": "claude-opus-4"
}
```

### Available Models

| Model | Context Window | Best For |
|-------|----------------|----------|
| claude-opus-4 | 200K | Most capable, complex tasks |
| claude-sonnet-4 | 200K | Balanced performance |
| claude-haiku-3 | 200K | Fast, simple tasks |

### Getting API Key

1. Go to https://console.anthropic.com/settings/keys
2. Click "Create Key"
3. Copy the key (starts with `sk-ant-`)
4. Add to Miaoda IDE

### Tips

- Claude excels at long-form content
- Great for code analysis and refactoring
- Supports vision in Opus and Sonnet

---

## Ollama (Local)

### Overview

- **Provider**: Ollama
- **Website**: https://ollama.ai
- **Docs**: https://github.com/ollama/ollama
- **Cost**: Free (runs locally)

### Configuration

```json
{
  "provider": "ollama",
  "apiUrl": "http://localhost:11434",
  "model": "llama2"
}
```

### Installation

**macOS**:
```bash
brew install ollama
ollama serve
```

**Linux**:
```bash
curl -fsSL https://ollama.ai/install.sh | sh
ollama serve
```

**Windows**:
Download from https://ollama.ai/download

### Available Models

| Model | Size | Best For |
|-------|------|----------|
| llama2 | 7B-70B | General purpose |
| codellama | 7B-34B | Code generation |
| mistral | 7B | Fast, efficient |
| mixtral | 8x7B | High quality |
| phi | 2.7B | Lightweight |

### Pulling Models

```bash
# Pull a model
ollama pull llama2

# List installed models
ollama list

# Run model
ollama run llama2
```

### Tips

- Requires significant RAM (8GB+ recommended)
- GPU acceleration supported (NVIDIA, AMD, Apple Silicon)
- No API key required
- Completely private - data never leaves your machine

---

## Azure OpenAI

### Overview

- **Provider**: Microsoft Azure
- **Website**: https://azure.microsoft.com/en-us/products/ai-services/openai-service
- **Docs**: https://learn.microsoft.com/en-us/azure/ai-services/openai/

### Configuration

```json
{
  "provider": "azure",
  "apiUrl": "https://YOUR_RESOURCE.openai.azure.com",
  "apiKey": "...",
  "model": "gpt-4",
  "headers": {
    "api-version": "2024-02-01"
  }
}
```

### Setup

1. Create Azure OpenAI resource
2. Deploy a model (e.g., gpt-4)
3. Get endpoint URL and API key
4. Configure in Miaoda IDE

### Endpoint Format

```
https://{resource-name}.openai.azure.com/openai/deployments/{deployment-name}/chat/completions?api-version={api-version}
```

### Tips

- Enterprise-grade security and compliance
- Data residency options
- Private networking support
- SLA guarantees

---

## Google AI

### Overview

- **Provider**: Google
- **Website**: https://ai.google.dev
- **API Docs**: https://ai.google.dev/docs
- **Pricing**: https://ai.google.dev/pricing

### Configuration

```json
{
  "provider": "google",
  "apiUrl": "https://generativelanguage.googleapis.com/v1",
  "apiKey": "...",
  "model": "gemini-pro"
}
```

### Available Models

| Model | Context Window | Best For |
|-------|----------------|----------|
| gemini-pro | 32K | Text generation |
| gemini-pro-vision | 16K | Multimodal (text + images) |
| gemini-ultra | 32K | Most capable (coming soon) |

### Getting API Key

1. Go to https://makersuite.google.com/app/apikey
2. Click "Create API Key"
3. Copy the key
4. Add to Miaoda IDE

### Tips

- Free tier available
- Strong multimodal capabilities
- Fast inference

---

## DeepSeek

### Overview

- **Provider**: DeepSeek (深度求索)
- **Website**: https://www.deepseek.com
- **API Docs**: https://platform.deepseek.com/docs
- **Pricing**: Competitive pricing

### Configuration

```json
{
  "provider": "deepseek",
  "apiUrl": "https://api.deepseek.com/v1",
  "apiKey": "...",
  "model": "deepseek-chat"
}
```

### Available Models

| Model | Context Window | Best For |
|-------|----------------|----------|
| deepseek-chat | 32K | General chat |
| deepseek-coder | 16K | Code generation |

### Getting API Key

1. Go to https://platform.deepseek.com
2. Register account
3. Create API key
4. Add to Miaoda IDE

### Tips

- Chinese and English support
- Cost-effective
- Good for code tasks

---

## Custom Providers

### OpenAI-Compatible APIs

Many providers offer OpenAI-compatible APIs:

- **Together AI**: https://together.ai
- **Anyscale**: https://anyscale.com
- **Perplexity**: https://perplexity.ai
- **Groq**: https://groq.com
- **OpenRouter**: https://openrouter.ai

### Configuration Template

```json
{
  "provider": "custom",
  "apiUrl": "https://api.provider.com/v1",
  "apiKey": "...",
  "model": "model-name",
  "headers": {
    "X-Custom-Header": "value"
  }
}
```

### Requirements

Custom providers should support:
- OpenAI-compatible chat completions endpoint
- Streaming responses (optional)
- Standard authentication (Bearer token)

### Testing Custom Providers

```bash
# Test with curl
curl https://api.provider.com/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "model-name",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

---

## Comparison Table

| Provider | Cost | Privacy | Speed | Quality | Local |
|----------|------|---------|-------|---------|-------|
| OpenAI | $$$ | Cloud | Fast | Excellent | ❌ |
| Anthropic | $$$ | Cloud | Fast | Excellent | ❌ |
| Ollama | Free | Private | Medium | Good | ✅ |
| Azure | $$$ | Enterprise | Fast | Excellent | ❌ |
| Google | $$ | Cloud | Very Fast | Good | ❌ |
| DeepSeek | $ | Cloud | Fast | Good | ❌ |

## Best Practices

### Security

1. **Never commit API keys** to version control
2. **Use environment variables** for CI/CD
3. **Rotate keys regularly**
4. **Monitor usage** for anomalies
5. **Set spending limits** where available

### Performance

1. **Choose appropriate model** for task complexity
2. **Use streaming** for better UX
3. **Cache responses** when possible
4. **Batch requests** to reduce latency
5. **Monitor rate limits**

### Cost Optimization

1. **Start with smaller models** (e.g., GPT-3.5)
2. **Use local models** for development
3. **Implement caching** to reduce API calls
4. **Set max tokens** appropriately
5. **Monitor and analyze** usage patterns

## Troubleshooting

### Common Errors

**401 Unauthorized**
- Check API key is correct
- Verify key has required permissions
- Check key hasn't expired

**429 Rate Limit**
- Reduce request frequency
- Upgrade API tier
- Implement exponential backoff

**500 Server Error**
- Provider service issue
- Try again later
- Check provider status page

**Timeout**
- Increase timeout setting
- Check network connection
- Try different endpoint region

## Support

For provider-specific issues:
- Check provider's status page
- Review provider's documentation
- Contact provider support

For Miaoda IDE issues:
- GitHub: https://github.com/miaoda/miaoda-ide/issues
- Discord: https://discord.gg/miaoda
- Email: support@miaoda.dev
