import React, { useState, useRef, useEffect } from 'react'
import { useStudy } from '../stores/StudyContext'
import { MessageSquare, PencilLine, CheckCircle2, AlertCircle, RotateCcw, Send, Loader2 } from 'lucide-react'
import CanvasDraw from './CanvasDraw'
import { evaluateAnswer, evaluateCanvas } from '../services/ai'

// Determine answer status from AI feedback text
function getAnswerStatus(feedback) {
  if (!feedback) return 'unknown'
  if (/^\s*\[正确\]/.test(feedback)) return 'correct'
  if (/^\s*\[引导\]/.test(feedback)) return 'partial'
  if (/^\s*\[再想\]/.test(feedback)) return 'wrong'
  if (/回答正确|理解到位|没错|说得对/.test(feedback)) return 'correct'
  if (/再想想|换个角度/.test(feedback)) return 'partial'
  return 'unknown'
}

const STATUS_CONFIG = {
  correct: { icon: CheckCircle2, color: 'green', label: '回答正确' },
  partial: { icon: AlertCircle, color: 'amber', label: '需要改进' },
  wrong: { icon: AlertCircle, color: 'red', label: '再想想' },
  unknown: { icon: AlertCircle, color: 'gray', label: '已回答' },
}

export default function QuestionArea({ section, onQuestionFocus }) {
  const { state, actions } = useStudy()
  const [activeInputId, setActiveInputId] = useState(null)
  const [inputMode, setInputMode] = useState('text')
  const [textInput, setTextInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const textareaRef = useRef(null)

  useEffect(() => {
    if (activeInputId && inputMode === 'text' && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [activeInputId, inputMode])

  if (!section?.questions || section.questions.length === 0) return null

  const handleRetry = (questionId) => {
    const uniqueKey = `${section.id}__${questionId}`
    actions.clearAnswer(uniqueKey)
    setActiveInputId(questionId)
    setInputMode('text')
  }

  const handleSubmit = async (questionId, answer, mode) => {
    if (!answer.trim() && mode === 'text') return

    const uniqueKey = `${section.id}__${questionId}`
    const qChatKey = `${section.id}__${questionId}__chat`

    setSubmitting(true)
    try {
      let feedback
      if (mode === 'canvas') {
        feedback = await evaluateCanvas(
          section.questions.find(q => q.id === questionId).text,
          answer,
          section.content
        )
      } else {
        feedback = await evaluateAnswer(
          section.questions.find(q => q.id === questionId).text,
          answer,
          section.content
        )
      }

      const status = getAnswerStatus(feedback)
      actions.setStudentAnswer(uniqueKey, answer, feedback, status)
      actions.addChatMessage(qChatKey, { role: 'student', content: mode === 'canvas' ? '[绘制了图示]' : answer })
      actions.addChatMessage(qChatKey, { role: 'assistant', content: feedback })

      // Focus this question in right panel
      onQuestionFocus?.(questionId)
    } catch (err) {
      actions.addChatMessage(qChatKey, { role: 'error', content: `提交失败: ${err.message}` })
    }
    setSubmitting(false)
    setTextInput('')
    setActiveInputId(null)
  }

  const handleTextSubmit = (questionId) => {
    if (!textInput.trim()) return
    handleSubmit(questionId, textInput, 'text')
  }

  const handleCanvasSubmit = (dataUrl) => {
    if (!activeInputId) return
    handleSubmit(activeInputId, dataUrl, 'canvas')
  }

  return (
    <div className="mt-8 space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-px flex-1 bg-gray-100" />
        <span className="text-xs text-gray-400 font-medium tracking-wider uppercase">检验理解</span>
        <div className="h-px flex-1 bg-gray-100" />
      </div>

      {section.questions.map((question, idx) => {
        const uniqueKey = `${section.id}__${question.id}`
        const answerData = state.studentAnswers[uniqueKey]
        const isActive = activeInputId === question.id
        const status = answerData?.status || 'unknown'
        const sConfig = STATUS_CONFIG[status]
        const StatusIcon = sConfig.icon

        return (
          <div key={question.id} className="question-card">
            {/* Question header */}
            <div className="flex items-start gap-3 mb-4">
              <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">
                {idx + 1}
              </span>
              <div className="flex-1">
                <p className="text-sm text-gray-800 font-medium leading-relaxed">{question.text}</p>
                {question.hint && <p className="text-xs text-gray-400 mt-1 italic">💡 {question.hint}</p>}
              </div>
            </div>

            {/* Answer status bar */}
            {answerData && (
              <div className={`ml-9 mb-4 p-3 rounded-lg ${
                status === 'correct' ? 'bg-green-50' :
                status === 'partial' ? 'bg-amber-50' :
                status === 'wrong' ? 'bg-red-50' : 'bg-gray-50'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StatusIcon size={14} className={
                      status === 'correct' ? 'text-green-500' :
                      status === 'partial' ? 'text-amber-500' :
                      status === 'wrong' ? 'text-red-500' : 'text-gray-400'
                    } />
                    <span className={`text-xs font-medium ${
                      status === 'correct' ? 'text-green-700' :
                      status === 'partial' ? 'text-amber-700' :
                      status === 'wrong' ? 'text-red-700' : 'text-gray-500'
                    }`}>
                      {sConfig.label}（第 {answerData.attempts} 次尝试）
                    </span>
                  </div>
                  {status !== 'correct' && !isActive && (
                    <button onClick={() => handleRetry(question.id)}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors">
                      <RotateCcw size={12} /> 再试一次
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Input area */}
            {!answerData ? (
              <div className="ml-9">
                {!isActive ? (
                  <div className="flex gap-2">
                    <button onClick={() => { setActiveInputId(question.id); setInputMode('text') }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 border border-gray-200">
                      <MessageSquare size={13} /> 输入文字
                    </button>
                    <button onClick={() => { setActiveInputId(question.id); setInputMode('canvas') }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 border border-gray-200">
                      <PencilLine size={13} /> 绘图作答
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <button onClick={() => setInputMode('text')}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs ${
                          inputMode === 'text' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:bg-gray-100'
                        }`}>
                        <MessageSquare size={12} /> 文字
                      </button>
                      <button onClick={() => setInputMode('canvas')}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs ${
                          inputMode === 'canvas' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:bg-gray-100'
                        }`}>
                        <PencilLine size={12} /> 画图
                      </button>
                    </div>

                    {inputMode === 'text' && (
                      <div className="writing-area">
                        <textarea
                          ref={textareaRef}
                          value={textInput}
                          onChange={(e) => setTextInput(e.target.value)}
                          placeholder="在此写下你的想法..."
                          rows={3}
                          className="w-full resize-none outline-none text-sm text-gray-800 placeholder-gray-300 bg-transparent leading-relaxed"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                              e.preventDefault(); handleTextSubmit(question.id)
                            }
                          }}
                        />
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-xs text-gray-300">
                            {textInput.length > 0 ? `${textInput.length} 字` : '按 Cmd+Enter 提交'}
                          </span>
                          <div className="flex gap-2">
                            <button onClick={() => setActiveInputId(null)}
                              className="text-xs text-gray-400 hover:text-gray-600">取消</button>
                            <button onClick={() => handleTextSubmit(question.id)}
                              disabled={!textInput.trim() || submitting}
                              className={`px-3 py-1 rounded text-xs font-medium ${
                                textInput.trim() && !submitting
                                  ? 'bg-gray-800 text-white hover:bg-gray-700'
                                  : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                              }`}>
                              {submitting ? '思考中...' : '提交'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {inputMode === 'canvas' && (
                      <CanvasDraw onSubmit={handleCanvasSubmit} placeholder="在此绘图作答..." />
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
