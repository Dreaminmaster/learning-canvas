import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useStudy, useCurrentSection } from '../stores/StudyContext'
import { getSocraticResponse } from '../services/ai'
import QuestionArea from './QuestionArea'
import AIChatPanel from './AIChatPanel'
import { ChevronLeft, ChevronRight, MessageSquare, PenLine, Send, Loader2 } from 'lucide-react'

export default function ContentEditor() {
  const { state, actions } = useStudy()
  const section = useCurrentSection()
  const { outline, currentSectionIndex } = state
  const [inlineInput, setInlineInput] = useState('')
  const [showInlineInput, setShowInlineInput] = useState(false)
  const [sending, setSending] = useState(false)
  const textareaRef = useRef(null)
  const contentRef = useRef(null)

  // Auto-focus the textarea when it appears
  useEffect(() => {
    if (showInlineInput && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [showInlineInput])

  if (!outline || !section) return null

  const hasPrev = currentSectionIndex > 0
  const hasNext = currentSectionIndex < outline.sections.length - 1

  const handleInlineSubmit = async () => {
    if (!inlineInput.trim()) return

    setSending(true)
    const userMsg = inlineInput
    setInlineInput('')
    setShowInlineInput(false)

    actions.addChatMessage(section.id, { role: 'student', content: userMsg })

    try {
      const response = await getSocraticResponse(
        `当前学习章节："${section.title}"\n\n章节内容：${section.content}\n\n学生的问题/想法：${userMsg}`
      )
      actions.addChatMessage(section.id, { role: 'assistant', content: response })
    } catch (err) {
      actions.addChatMessage(section.id, {
        role: 'error',
        content: `AI 回复失败: ${err.message}`,
      })
    }
    setSending(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleInlineSubmit()
    }
    if (e.key === 'Escape') {
      setShowInlineInput(false)
      setInlineInput('')
    }
  }

  return (
    <div className="flex-1 flex h-full bg-white">
      {/* Main content area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top navigation */}
        <div className="flex items-center justify-between px-8 py-4 flex-shrink-0 border-b border-gray-50">
          <button
            onClick={() => actions.setCurrentSection(currentSectionIndex - 1)}
            disabled={!hasPrev}
            className={`flex items-center gap-1 text-xs transition-colors ${
              hasPrev ? 'text-gray-400 hover:text-gray-700' : 'text-gray-200 cursor-not-allowed'
            }`}
          >
            <ChevronLeft size={14} />
            上一节
          </button>
          <span className="text-xs text-gray-300">
            {currentSectionIndex + 1} / {outline.sections.length}
          </span>
          <button
            onClick={() => actions.setCurrentSection(currentSectionIndex + 1)}
            disabled={!hasNext}
            className={`flex items-center gap-1 text-xs transition-colors ${
              hasNext ? 'text-gray-400 hover:text-gray-700' : 'text-gray-200 cursor-not-allowed'
            }`}
          >
            下一节
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Scrollable content */}
        <div ref={contentRef} className="flex-1 overflow-y-auto hide-scrollbar">
          <div className="max-w-3xl mx-auto px-8 py-10">
            {/* Section title */}
            <h1 className="text-2xl font-semibold text-gray-900 mb-8 leading-tight">
              {section.title}
            </h1>

            {/* Content - rendered as formatted HTML */}
            <div
              className="tiptap prose prose-gray max-w-none"
              dangerouslySetInnerHTML={{
                __html: formatContent(section.content),
              }}
            />

            {/* Inline writing area - the "blank paper" section */}
            <div className="mt-12 mb-8">
              <div className="flex items-center gap-2 mb-4 opacity-0 hover:opacity-100 transition-opacity">
                <div className="h-px flex-1 bg-gray-100" />
                <span className="text-xs text-gray-300">笔记区</span>
                <div className="h-px flex-1 bg-gray-100" />
              </div>

              {/* Paper-like writing space */}
              <div
                className="writing-area min-h-[60px] cursor-text group"
                onClick={() => setShowInlineInput(true)}
              >
                {showInlineInput ? (
                  <div className="relative">
                    <textarea
                      ref={textareaRef}
                      value={inlineInput}
                      onChange={(e) => setInlineInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="写下你的疑问或想法..."
                      rows={2}
                      className="w-full resize-none outline-none text-gray-700 placeholder-gray-200 bg-transparent leading-relaxed text-[15px]"
                    />
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-300">
                        {sending ? 'AI 正在思考...' : 'Cmd+Enter 发送 · Esc 取消'}
                      </span>
                      <div className="flex items-center gap-2">
                        {sending && <Loader2 size={14} className="animate-spin text-gray-400" />}
                        <button
                          onClick={handleInlineSubmit}
                          disabled={!inlineInput.trim() || sending}
                          className={`flex items-center gap-1 px-3 py-1 rounded text-xs transition-all ${
                            inlineInput.trim() && !sending
                              ? 'bg-gray-800 text-white hover:bg-gray-700'
                              : 'text-gray-300 cursor-not-allowed'
                          }`}
                        >
                          <Send size={12} />
                          发送
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-200 text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    <PenLine size={16} className="mx-auto mb-1" />
                    <span>点击此处写下你的想法或问题</span>
                  </div>
                )}
              </div>
            </div>

            {/* Questions section */}
            <QuestionArea section={section} />

            {/* Bottom padding */}
            <div className="h-20" />
          </div>
        </div>

        {/* Section navigation footer */}
        {hasNext && (
          <div className="flex-shrink-0 px-8 py-4 border-t border-gray-50">
            <button
              onClick={() => actions.setCurrentSection(currentSectionIndex + 1)}
              className="w-full py-3 bg-gray-50 hover:bg-gray-100 rounded-xl text-sm text-gray-600 font-medium transition-colors flex items-center justify-center gap-2"
            >
              继续学习：{outline.sections[currentSectionIndex + 1].title}
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* AI Chat panel (right 1/3) */}
      <div className="w-px bg-gray-50 flex-shrink-0" />
      <div className="w-80 flex-shrink-0 h-full p-6 border-l border-gray-50 flex flex-col overflow-hidden">
        <AIChatPanel sectionId={section.id} />
      </div>
    </div>
  )
}

/**
 * Format plain text content to HTML with basic markdown-like formatting
 */
function formatContent(content) {
  if (!content) return ''

  let html = content
    // Code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
      return `<pre><code class="language-${lang}">${escapeHtml(code.trim())}</code></pre>`
    })
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Unordered lists
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // Ordered lists
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // Paragraphs
    .replace(/\n\n/g, '</p><p>')
    // Line breaks
    .replace(/\n/g, '<br/>')

  // Wrap consecutive <li> in <ul>
  html = html.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>')
  html = html.replace(/<\/ul>\s*<ul>/g, '')

  return `<p>${html}</p>`
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
