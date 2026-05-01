import React, { useState, useRef } from 'react'
import { useStudy } from '../stores/StudyContext'
import { MessageSquare, PencilLine, CheckCircle2, AlertCircle } from 'lucide-react'
import CanvasDraw from './CanvasDraw'
import { evaluateAnswer } from '../services/ai'

export default function QuestionArea({ section }) {
  const { state, actions } = useStudy()
  const [activeQuestionId, setActiveQuestionId] = useState(null)
  const [inputMode, setInputMode] = useState('text') // text | canvas
  const [textInput, setTextInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const textareaRef = useRef(null)

  if (!section?.questions || section.questions.length === 0) return null

  const handleSubmit = async (questionId, answer, mode) => {
    if (!answer.trim() && mode === 'text') return

    setSubmitting(true)
    try {
      const feedback = await evaluateAnswer(
        section.questions.find(q => q.id === questionId).text,
        mode === 'canvas' ? '[学生绘制了一幅图]' : answer,
        section.content
      )
      actions.setStudentAnswer(questionId, answer, feedback)
      actions.addChatMessage(section.id, {
        role: 'student',
        content: mode === 'canvas' ? '[绘制了图示]' : answer,
      })
      actions.addChatMessage(section.id, {
        role: 'assistant',
        content: feedback,
      })
    } catch (err) {
      actions.addChatMessage(section.id, {
        role: 'error',
        content: `提交失败: ${err.message}`,
      })
    }
    setSubmitting(false)
    setActiveQuestionId(null)
    setTextInput('')
  }

  const handleTextSubmit = (questionId) => {
    if (!textInput.trim()) return
    handleSubmit(questionId, inputMode === 'text' ? textInput : '[canvas]', inputMode)
  }

  const handleCanvasSubmit = (dataUrl, type) => {
    if (!activeQuestionId) return
    handleSubmit(activeQuestionId, dataUrl, 'canvas')
  }

  return (
    <div className="mt-8 space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-px flex-1 bg-gray-100" />
        <span className="text-xs text-gray-400 font-medium tracking-wider uppercase">
          检验理解
        </span>
        <div className="h-px flex-1 bg-gray-100" />
      </div>

      {section.questions.map((question, idx) => {
        const answerData = state.studentAnswers[question.id]
        const isActive = activeQuestionId === question.id

        return (
          <div key={question.id} className="question-card">
            {/* Question */}
            <div className="flex items-start gap-3 mb-4">
              <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">
                {idx + 1}
              </span>
              <div className="flex-1">
                <p className="text-sm text-gray-800 font-medium leading-relaxed">
                  {question.text}
                </p>
                {question.hint && (
                  <p className="text-xs text-gray-400 mt-1 italic">
                    💡 {question.hint}
                  </p>
                )}
              </div>
              {answerData && (
                <CheckCircle2 size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
              )}
            </div>

            {/* Answer status */}
            {answerData && (
              <div className="ml-9 mb-4 p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 size={14} className="text-green-500" />
                  <span className="text-xs text-green-700 font-medium">
                    已回答 ({answerData.attempts} 次尝试)
                  </span>
                </div>
                <p className="text-sm text-green-800">{answerData.answer.substring(0, 100)}</p>
                {answerData.answer.startsWith('data:image') && (
                  <img src={answerData.answer} alt="你的作答" className="mt-2 max-h-20 rounded" />
                )}
              </div>
            )}

            {/* Input area */}
            {!answerData && (
              <div className="ml-9">
                {!isActive ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setActiveQuestionId(question.id)
                        setInputMode('text')
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors border border-gray-200"
                    >
                      <MessageSquare size={13} />
                      输入文字
                    </button>
                    <button
                      onClick={() => {
                        setActiveQuestionId(question.id)
                        setInputMode('canvas')
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors border border-gray-200"
                    >
                      <PencilLine size={13} />
                      绘图作答
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Mode toggle */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setInputMode('text')}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors ${
                          inputMode === 'text' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        <MessageSquare size={12} />
                        文字
                      </button>
                      <button
                        onClick={() => setInputMode('canvas')}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors ${
                          inputMode === 'canvas' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        <PencilLine size={12} />
                        画图
                      </button>
                    </div>

                    {/* Text input - paper-like */}
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
                              handleTextSubmit(question.id)
                            }
                          }}
                          autoFocus
                        />
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-xs text-gray-300">
                            {textInput.length > 0 ? `${textInput.length} 字` : '按 Cmd+Enter 提交'}
                          </span>
                          <button
                            onClick={() => handleTextSubmit(question.id)}
                            disabled={!textInput.trim() || submitting}
                            className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                              textInput.trim() && !submitting
                                ? 'bg-gray-800 text-white hover:bg-gray-700'
                                : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                            }`}
                          >
                            {submitting ? '思考中...' : '提交'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Canvas input */}
                    {inputMode === 'canvas' && (
                      <CanvasDraw
                        onSubmit={handleCanvasSubmit}
                        placeholder="在此绘图作答..."
                      />
                    )}

                    <button
                      onClick={() => setActiveQuestionId(null)}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      收起
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
