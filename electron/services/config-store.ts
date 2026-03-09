import fs from 'node:fs'
import path from 'node:path'

type AppConfig = {
  anthropicApiKey?: string
  defaultModel?: string
  apiBaseUrl?: string
  modelOptions?: string[]
  protocol?: 'anthropic' | 'openai'
}

export class ConfigStore {
  private readonly configPath: string

  constructor(configPath: string) {
    this.configPath = configPath
    this.ensureFile()
  }

  private ensureFile() {
    const dir = path.dirname(this.configPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    if (!fs.existsSync(this.configPath)) {
      fs.writeFileSync(this.configPath, JSON.stringify({}, null, 2), 'utf-8')
    }
  }

  private readConfig(): AppConfig {
    try {
      const raw = fs.readFileSync(this.configPath, 'utf-8')
      const parsed = JSON.parse(raw) as AppConfig
      return parsed && typeof parsed === 'object' ? parsed : {}
    } catch {
      return {}
    }
  }

  private writeConfig(next: AppConfig) {
    fs.writeFileSync(this.configPath, JSON.stringify(next, null, 2), 'utf-8')
  }

  getConfig(): AppConfig {
    return this.readConfig()
  }

  setAnthropicApiKey(apiKey: string) {
    const current = this.readConfig()
    current.anthropicApiKey = apiKey
    this.writeConfig(current)
  }

  clearAnthropicApiKey() {
    const current = this.readConfig()
    delete current.anthropicApiKey
    this.writeConfig(current)
  }

  setDefaultModel(model: string) {
    const current = this.readConfig()
    current.defaultModel = model
    this.writeConfig(current)
  }

  setApiBaseUrl(apiBaseUrl: string) {
    const current = this.readConfig()
    current.apiBaseUrl = apiBaseUrl
    this.writeConfig(current)
  }

  setModelOptions(modelOptions: string[]) {
    const current = this.readConfig()
    current.modelOptions = modelOptions
    this.writeConfig(current)
  }

  setProtocol(protocol: 'anthropic' | 'openai') {
    const current = this.readConfig()
    current.protocol = protocol
    this.writeConfig(current)
  }
}
