import { ipcMain } from 'electron'
import { ConfigStore } from '../services/config-store'

export function registerConfigHandlers(configStore: ConfigStore) {
  ipcMain.handle('config:get', () => {
    const config = configStore.getConfig()
    const defaults = ['claude-3-5-sonnet-latest', 'claude-3-7-sonnet-latest', 'claude-3-7-opus-latest']
    const modelOptions = Array.isArray(config.modelOptions)
      ? Array.from(new Set([...defaults, ...config.modelOptions.filter((m) => typeof m === 'string' && m.trim().length > 0)]))
      : defaults

    return {
      hasAnthropicApiKey: Boolean(config.anthropicApiKey),
      defaultModel: config.defaultModel ?? 'claude-3-5-sonnet-latest',
      apiBaseUrl: config.apiBaseUrl ?? 'https://api.anthropic.com',
      modelOptions,
      protocol: config.protocol ?? 'anthropic',
    }
  })

  ipcMain.handle('config:set-api-key', (_event, apiKey: string) => {
    if (typeof apiKey !== 'string' || apiKey.trim().length === 0) {
      throw new Error('API Key 不能为空')
    }

    configStore.setAnthropicApiKey(apiKey.trim())
    return { ok: true }
  })

  ipcMain.handle('config:clear-api-key', () => {
    configStore.clearAnthropicApiKey()
    return { ok: true }
  })

  ipcMain.handle('config:set-default-model', (_event, model: string) => {
    if (typeof model !== 'string' || model.trim().length === 0) {
      throw new Error('模型不能为空')
    }

    configStore.setDefaultModel(model.trim())
    return { ok: true }
  })

  ipcMain.handle('config:set-api-base-url', (_event, apiBaseUrl: string) => {
    if (typeof apiBaseUrl !== 'string' || apiBaseUrl.trim().length === 0) {
      throw new Error('链接不能为空')
    }

    const value = apiBaseUrl.trim().replace(/\/+$/, '')
    try {
      const parsed = new URL(value)
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('仅支持 http/https')
      }
    } catch {
      throw new Error('链接格式不正确')
    }

    configStore.setApiBaseUrl(value)
    return { ok: true }
  })

  ipcMain.handle('config:set-model-options', (_event, modelOptions: string[]) => {
    if (!Array.isArray(modelOptions)) {
      throw new Error('模型列表格式无效')
    }

    const cleaned = modelOptions
      .filter((m) => typeof m === 'string')
      .map((m) => m.trim())
      .filter((m) => m.length > 0)

    configStore.setModelOptions(Array.from(new Set(cleaned)))
    return { ok: true }
  })

  ipcMain.handle('config:set-protocol', (_event, protocol: 'anthropic' | 'openai') => {
    if (protocol !== 'anthropic' && protocol !== 'openai') {
      throw new Error('协议无效')
    }

    configStore.setProtocol(protocol)
    return { ok: true }
  })
}
