/**
 * AI Service Layer — Three-stage outline generation pipeline
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
  return Object.entries(PROVIDERS).map(([key, val]) => ({ id: key, name: val.name }))
}

// ─── System prompt ───
function getSystemPrompt() {
  return `你是一位苏格拉底式学习助教。你的任务是帮助学生深入理解学习内容，而不是直接给出答案。

核心原则：
1. 不要直接告诉学生答案，而是通过引导性问题帮助他们自己思考
2. 当学生回答正确时，给予肯定并简短回应，不要追问新问题
3. 当学生回答错误时，不要直接纠正，而是提供线索，引导他们发现问题
4. 回复简洁，不超过150字，用中文，不要markdown格式`
}

// ─── Low-level API call ───
export async function chatCompletion(messages, config = null) {
  const cfg = config || getAIConfig()
  const provider = PROVIDERS[cfg.provider] || PROVIDERS.custom
  const endpoint = cfg.endpoint || provider.defaultEndpoint
  const model = cfg.model || provider.defaultModel
  const apiKey = cfg.apiKey

  if (!apiKey) throw new Error('请先配置 API Key')

  if (cfg.provider === 'gemini') {
    const url = `${endpoint}/${model}:generateContent?key=${apiKey}`
    const geminiMessages = messages.filter(m => m.role !== 'system')
      .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }))
    const systemMsg = messages.find(m => m.role === 'system')
    if (systemMsg) {
      geminiMessages.unshift({ role: 'user', parts: [{ text: `[系统指令] ${systemMsg.content}` }] })
      geminiMessages.splice(1, 0, { role: 'model', parts: [{ text: '明白。' }] })
    }
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: geminiMessages, generationConfig: { temperature: 0.7, maxOutputTokens: 4096 } }),
    })
    const data = await response.json()
    if (data.error) throw new Error(data.error.message)
    return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  }

  const isMiMo = cfg.provider === 'mimo'
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      [provider.apiKeyHeader]: `${provider.apiKeyPrefix}${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      ...(isMiMo ? { max_completion_tokens: 4096 } : { max_tokens: 4096 }),
      stream: false,
    }),
  })

  if (!response.ok) throw new Error(`API Error (${response.status}): ${await response.text()}`)
  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}

// Parse JSON from AI response (strips markdown code blocks)
function parseJSON(raw) {
  const jsonStr = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(jsonStr)
}

// ─── Three-stage outline generation pipeline ───

/**
 * Stage 1: Extract chapter skeleton from learning materials
 * Returns: { title, sections: [{ id, title, keyConcepts: string[] }] }
 */
async function extractSkeleton(materialText) {
  const prompt = `分析以下学习资料，提取学习主题和章节骨架。

要求：
- 生成 3-6 个章节，由浅入深，每章有明确的知识递进关系
- 每章列出 2-4 个核心概念/知识点
- 章节之间必须有逻辑关联，后一章依赖前一章的知识
- 如果资料内容较少，减少章节数量，不要硬拆

只返回JSON，格式：
{"title":"学习主题","sections":[{"id":"s1","title":"章节标题","keyConcepts":["概念1","概念2"]}]}

学习资料：
${materialText}`

  const raw = await chatCompletion([
    { role: 'system', content: '你是学习内容分析师。只返回JSON，不要其他文字。' },
    { role: 'user', content: prompt },
  ])

  return parseJSON(raw)
}

/**
 * Stage 2: Generate detailed content for one chapter
 * Takes skeleton + previous chapter context for coherence
 * Returns: content string (200-500 words with markdown)
 */
async function generateChapterContent(skeleton, chapterIndex, previousChapterSummary) {
  const chapter = skeleton.sections[chapterIndex]
  const isFirst = chapterIndex === 0

  const contextNote = isFirst
    ? `这是第一章，从基础概念开始。`
    : `上一章的要点是：${previousChapterSummary}。本章要在此基础上递进，自然衔接。`

  const prompt = `为以下章节生成详细的学习内容。

学习主题：${skeleton.title}
章节标题：${chapter.title}
核心概念：${chapter.keyConcepts.join('、')}
背景：${contextNote}

要求：
- 内容 300-500 字，用中文
- 由浅入深讲解每个核心概念，用类比帮助理解
- 包含 1-2 个代码示例（用 \`\`\` 包裹）
- 概念之间要有逻辑关联，不要跳跃
- 确保内容深度适合初学者，不要引入本章未讲的概念`

  return chatCompletion([
    { role: 'system', content: '你是一位优秀的编程教师。用简洁清晰的中文讲解概念。' },
    { role: 'user', content: prompt },
  ])
}

/**
 * Stage 3: Generate questions for one chapter
 * STRICTLY based on the content — no superhuman questions
 * Returns: questions array
 */
async function generateChapterQuestions(chapterTitle, chapterContent, chapterConcepts) {
  const prompt = `根据以下章节内容，生成检验理解的问题。

章节标题：${chapter.title}
章节内容：
${chapterContent}
核心概念：${chapterConcepts.join('、')}

严格要求：
- 问题只能考查内容中明确讲过的概念，不能超纲
- 问题难度与内容深度匹配，不能比内容深
- 每章 1-3 个问题
- 大部分应该是 text 类型，只有需要画图/流程图时才用 canvas 类型

只返回JSON，格式：
[{"id":"q1","text":"问题描述","type":"text","hint":"提示"}]`

  const raw = await chatCompletion([
    { role: 'system', content: '你是出题老师。严格基于内容出题，不超纲。只返回JSON。' },
    { role: 'user', content: prompt },
  ])

  return parseJSON(raw)
}

/**
 * Main entry: Generate outline using the three-stage pipeline
 * Calls onProgress(step, chapterIndex, totalChapters) for UI updates
 */
export async function generateOutline(materialText, onProgress = null) {
  // Stage 1: Extract skeleton
  onProgress?.('skeleton', 0, 0)
  const skeleton = await extractSkeleton(materialText)
  const total = skeleton.sections.length

  // Stage 2+3: Generate content and questions for each chapter
  const sections = []
  let previousSummary = ''

  for (let i = 0; i < total; i++) {
    onProgress?.('content', i, total)
    const content = await generateChapterContent(skeleton, i, previousSummary)

    onProgress?.('questions', i, total)
    const questions = await generateChapterQuestions(skeleton.sections[i].title, content, skeleton.sections[i].keyConcepts)

    sections.push({
      id: skeleton.sections[i].id,
      title: skeleton.sections[i].title,
      content,
      questions,
    })

    // Build summary for next chapter's context
    previousSummary = `${skeleton.sections[i].title}: ${skeleton.sections[i].keyConcepts.join('、')}`
  }

  return { title: skeleton.title, sections }
}

// ─── Socratic Q&A ───

export async function getSocraticResponse(context, config = null) {
  const cfg = config || getAIConfig()
  const systemPrompt = cfg.systemPrompt || getSystemPrompt()
  return chatCompletion([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: context },
  ], cfg)
}

export async function evaluateAnswer(questionText, studentAnswer, sectionContent, config = null) {
  const cfg = config || getAIConfig()
  const systemPrompt = cfg.systemPrompt || getSystemPrompt()

  const prompt = `章节内容：${sectionContent.substring(0, 500)}

问题："${questionText}"
学生回答："${studentAnswer}"

判断回答是否正确，在回复最前面加状态标签：
- [正确] 回答基本正确 → 简短肯定，不追问新问题
- [引导] 部分正确 → 指出对的部分，对不足给线索
- [再想] 完全错误 → 用类比引导重新思考

回复不超过120字，用中文。`

  return chatCompletion([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: prompt },
  ], cfg)
}

export async function evaluateCanvas(questionText, imageDataUrl, sectionContent) {
  const cfg = getAIConfig()
  const imageModel = cfg.provider === 'mimo' ? 'mimo-v2.5' : cfg.model
  const endpoint = cfg.endpoint || 'https://api.xiaomimimo.com/v1/chat/completions'

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': cfg.apiKey },
    body: JSON.stringify({
      model: imageModel,
      messages: [
        { role: 'system', content: '你是学习助教。分析学生画的图，判断理解是否正确。用中文回复，不超过120字。' },
        { role: 'user', content: [
          { type: 'text', text: `章节内容：${sectionContent.substring(0, 300)}\n问题："${questionText}"\n请分析学生画的这张图：` },
          { type: 'image_url', image_url: { url: imageDataUrl } },
        ]},
      ],
      max_completion_tokens: 1024,
      temperature: 0.7,
      stream: false,
    }),
  })

  if (!response.ok) throw new Error(`API Error (${response.status}): ${await response.text()}`)
  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}
