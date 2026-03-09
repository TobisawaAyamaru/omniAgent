import { ConfigStore } from './config-store'

export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

type ClaudeContentBlock = {
  type: 'text'
  text: string
}

type AnthropicResponse = {
  content?: ClaudeContentBlock[]
}

type OpenAIResponse = {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
}

export class ClaudeService {
  private readonly configStore: ConfigStore

  constructor(configStore: ConfigStore) {
    this.configStore = configStore
  }

  async sendMessage(messages: ChatMessage[]): Promise<string> {
    const config = this.configStore.getConfig()
    const apiKey = config.anthropicApiKey
    const model = config.defaultModel ?? 'claude-3-5-sonnet-latest'
    const apiBaseUrl = (config.apiBaseUrl ?? 'https://api.anthropic.com').replace(/\/+$/, '')
    const protocol = config.protocol ?? 'anthropic'

    if (!apiKey) {
      throw new Error('未配置 API Key，请先到设置页保存。')
    }

    const userMessages = messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.content }))

    if (protocol === 'openai') {
      const response = await fetch(`${apiBaseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: userMessages,
        }),
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(`OpenAI 兼容请求失败（${response.status}）：${text}`)
      }

      const data = (await response.json()) as OpenAIResponse
      const text = data.choices?.[0]?.message?.content?.trim()
      if (!text) {
        throw new Error('模型返回为空，请稍后重试。')
      }
      return text
    }

    const response = await fetch(`${apiBaseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        messages: userMessages,
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Anthropic 请求失败（${response.status}）：${text}`)
    }

    const data = (await response.json()) as AnthropicResponse
    const text = data.content?.map((part) => part.text).join('\n').trim()

    if (!text) {
      throw new Error('模型返回为空，请稍后重试。')
    }

    return text
  }
}
