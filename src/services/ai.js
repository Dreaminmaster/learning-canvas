/**
 * AI Service Layer
 * Supports multiple providers with a unified interface.
 * Currently: MiMo (小米), with extensibility for OpenAI, Gemini, etc.
 */

// Provider configurations
const PROVIDERS = {
  mimo: {
    name: 'MiMo (小米)',
    defaultEndpoint: 'https://api.xiaoai.mi.com/v1/chat/completions',
    defaultModel: 'mimo-v1',
    apiKeyHeader: 'Authorization',
    apiKeyPrefix: 'Bearer ',
  },
  openai: {
    name: 'OpenAI',
    defaultEndpoint: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4o-mini',
    apiKeyHeader: 'Authorization',
    apiKeyPrefix: 'Bearer ',
  },
  gemini: {
    name: 'Gemini (Google)',
    defaultEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
    defaultModel: 'gemini-pro',
    apiKeyHeader: 'x-goog-api-key',
    apiKeyPrefix: '',
  },
  custom: {
    name: 'Custom (OpenAI Compatible)',
    defaultEndpoint: '',
    defaultModel: '',
    apiKeyHeader: 'Authorization',
    apiKeyPrefix: 'Bearer ',
  },
}

// Persistent config
const CONFIG_KEY = 'learning-canvas-ai-config'

export function getAIConfig() {
  try {
    const saved = localStorage.getItem(CONFIG_KEY)
    if (saved) return JSON.parse(saved)
  } catch {}
  return {
    provider: 'mimo',
    endpoint: '',
    model: '',
    apiKey: '',
    systemPrompt: getSystemPrompt(),
  }
}

export function saveAIConfig(config) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
}

export function listProviders() {
  return Object.entries(PROVIDERS).map(([key, val]) => ({
    id: key,
    name: val.name,
  }))
}

// System prompts
function getSystemPrompt() {
  return `你是一位苏格拉底式学习助教。你的任务是帮助学生深入理解学习内容，而不是直接给出答案。

核心原则：
1. 不要直接告诉学生答案，而是通过引导性问题帮助他们自己思考
2. 当学生回答正确时，给予肯定并深入追问"为什么"
3. 当学生回答错误时，不要直接纠正，而是提供线索，引导他们发现问题
4. 使用类比、举例等方式帮助理解抽象概念
5. 鼓励学生表达自己的理解，即使不完整
6. 保持温暖、耐心的语气

回复格式：
- 简洁明了，每次回复不超过 200 字
- 用中文回复
- 不要使用 markdown 格式`
}

// Default outline generation prompt
function getOutlinePrompt(materialText) {
  return `请根据以下学习资料，生成一份结构化的学习大纲。

要求：
1. 大纲以 JSON 格式返回
2. 每个章节包含：id、title、content（详细的文本内容，200-500字）
3. 每个章节末尾包含 1-3 个"检验问题"（questions），用于测试学生理解程度
4. 内容由浅入深，循序渐进
5. 代码示例需要用 markdown code block 格式

JSON 结构：
{
  "title": "学习主题",
  "sections": [
    {
      "id": "s1",
      "title": "章节标题",
      "content": "详细的文本内容...",
      "questions": [
        {
          "id": "q1",
          "text": "问题描述",
          "type": "text", // text 或 canvas
          "hint": "提示信息（可选）"
        }
      ]
    }
  ]
}

学习资料：
${materialText}

请直接返回 JSON，不要包含其他文字。`
}

// Chat completion call
export async function chatCompletion(messages, config = null) {
  const cfg = config || getAIConfig()
  const provider = PROVIDERS[cfg.provider] || PROVIDERS.custom

  const endpoint = cfg.endpoint || provider.defaultEndpoint
  const model = cfg.model || provider.defaultModel
  const apiKey = cfg.apiKey

  if (!apiKey) {
    throw new Error('请先配置 API Key')
  }

  // Build request based on provider
  let response

  if (cfg.provider === 'gemini') {
    // Gemini uses a different API format
    const url = `${endpoint}/${model}:generateContent?key=${apiKey}`
    const geminiMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }))

    // Prepend system prompt as first user message if exists
    const systemMsg = messages.find(m => m.role === 'system')
    if (systemMsg) {
      geminiMessages.unshift({
        role: 'user',
        parts: [{ text: `[系统指令] ${systemMsg.content}` }],
      })
      geminiMessages.splice(1, 0, {
        role: 'model',
        parts: [{ text: '我理解了系统指令，现在开始扮演苏格拉底式学习助教的角色。' }],
      })
    }

    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: geminiMessages,
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
      }),
    })

    const data = await response.json()
    if (data.error) throw new Error(data.error.message)
    return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  }

  // OpenAI-compatible format (MiMo, OpenAI, Custom)
  response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      [provider.apiKeyHeader]: `${provider.apiKeyPrefix}${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 2048,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`API Error (${response.status}): ${err}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}

// Generate outline from learning material
export async function generateOutline(materialText, config = null) {
  const cfg = config || getAIConfig()
  const systemPrompt = cfg.systemPrompt || getSystemPrompt()

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: getOutlinePrompt(materialText) },
  ]

  const raw = await chatCompletion(messages, cfg)

  // Try to parse JSON from the response
  try {
    // Remove markdown code blocks if present
    const jsonStr = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(jsonStr)
  } catch {
    throw new Error('AI 返回的格式无法解析，请重试或调整学习资料内容。')
  }
}

// Socratic response to student's question/answer
export async function getSocraticResponse(context, config = null) {
  const cfg = config || getAIConfig()
  const systemPrompt = cfg.systemPrompt || getSystemPrompt()

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: context },
  ]

  return chatCompletion(messages, cfg)
}

// Evaluate student's answer to a question
export async function evaluateAnswer(questionText, studentAnswer, sectionContent, config = null) {
  const cfg = config || getAIConfig()
  const systemPrompt = cfg.systemPrompt || getSystemPrompt()

  const prompt = `以下是当前学习章节的内容：
---
${sectionContent}
---

章节末尾的问题是："${questionText}"

学生的回答是："${studentAnswer}"

请根据以下规则回应：
1. 如果回答正确且理解到位：给予肯定，然后追问一个更深入的问题
2. 如果回答部分正确：肯定对的部分，对不足的部分给出引导性提示
3. 如果回答错误：不要直接说"错了"，而是提供一个线索或类比，引导学生重新思考
4. 如果学生画了图（传入图片描述）：仔细分析图中的内容，判断是否正确表达了概念

请用中文回复，简洁明了。`

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: prompt },
  ]

  return chatCompletion(messages, cfg)
}
