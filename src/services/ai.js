/**
 * AI Service Layer
 * Supports multiple providers with a unified interface.
 * Currently: MiMo (小米), with extensibility for OpenAI, Gemini, etc.
 */

// Provider configurations
const PROVIDERS = {
  mimo: {
    name: 'MiMo (小米)',
    defaultEndpoint: 'https://api.xiaomimimo.com/v1/chat/completions',
    defaultModel: 'mimo-v2.5-pro',
    apiKeyHeader: 'api-key',
    apiKeyPrefix: '',
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
    endpoint: 'https://api.xiaomimimo.com/v1/chat/completions',
    model: 'mimo-v2.5-pro',
    apiKey: 'sk-ctf0zghx7e5hwufkbjfoj4j7qzsai2x49bnk4xrmxdav8g21',
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

// Outline generation prompt - optimized for MiMo
function getOutlinePrompt(materialText) {
  return `请根据以下学习资料生成JSON格式的学习大纲。

只返回JSON，不要其他文字。JSON结构：
{"title":"主题","sections":[{"id":"s1","title":"标题","content":"200-500字的详细内容，支持markdown格式","questions":[{"id":"q1","text":"检验理解的问题","type":"text","hint":"可选提示"}]}]}

要求：
- sections 3-6节，由浅入深
- 每节content包含概念解释和代码示例（用\`\`\`包裹）
- 每节1-3个questions，类型可以是text或canvas
- 用中文

学习资料：
${materialText}`
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

  // MiMo uses max_completion_tokens, OpenAI uses max_tokens
  const isMiMo = cfg.provider === 'mimo'

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
      ...(isMiMo
        ? { max_completion_tokens: 4096 }
        : { max_tokens: 4096 }
      ),
      stream: false,
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

请严格按照以下步骤回应：

第一步：判断学生的回答是否正确。仔细对照章节内容，逐个检查学生提到的要点。
- 如果学生回答基本正确（核心概念都涉及了）→ 进入第二步A
- 如果学生回答有明显错误或遗漏了关键点 → 进入第二步B
- 如果学生回答完全错误 → 进入第二步C

第二步A（正确）：先明确说"回答正确"或"理解到位"，然后追问一个更深入的问题让学生思考。

第二步B（部分正确）：先指出哪些部分理解正确，然后针对不足之处给出线索和引导，让学生自己补全。

第二步C（错误）：不要直接说"错了"，而是说"再想想"或"换个角度"，然后提供一个类比或线索帮助学生重新思考。

注意：不要因为礼貌而把错误的回答说成正确！准确判断是最重要的。
回复用中文，简洁明了，不超过150字。`

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: prompt },
  ]

  return chatCompletion(messages, cfg)
}

// Evaluate student's canvas drawing using MiMo vision API
export async function evaluateCanvas(questionText, imageDataUrl, sectionContent) {
  const cfg = getAIConfig()

  // MiMo image recognition requires mimo-v2.5 (not -pro)
  const imageModel = cfg.provider === 'mimo' ? 'mimo-v2.5' : cfg.model
  const endpoint = cfg.endpoint || 'https://api.xiaomimimo.com/v1/chat/completions'

  const messages = [
    {
      role: 'system',
      content: '你是一位苏格拉底式学习助教。学生画了一张图来回答问题。请分析图片内容，判断学生的理解是否正确，然后用引导性的方式回应。不超过200字，用中文，不要markdown。'
    },
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: `学习章节内容：\n${sectionContent}\n\n问题是："${questionText}"\n\n请分析学生画的这张图：`
        },
        {
          type: 'image_url',
          image_url: { url: imageDataUrl }
        }
      ]
    }
  ]

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': cfg.apiKey,
    },
    body: JSON.stringify({
      model: imageModel,
      messages,
      max_completion_tokens: 1024,
      temperature: 0.7,
      stream: false,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`API Error (${response.status}): ${err}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}
