import React, { useRef, useEffect } from 'react'
import { useStudy } from '../stores/StudyContext'
import { Bot, User, AlertTriangle } from 'lucide-react'

export default function AIChatPanel({ sectionId, focusedQuestionId }) {
  const { state } = useStudy()
  const scrollRef = useRef(null)

  // If a question is focused, show its chat; otherwise show empty
  const qChatKey = focusedQuestionId ? `${sectionId}__${focusedQuestionId}__chat` : null
  const messages = qChatKey ? (state.chatMessages[qChatKey] || []) : []

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages.length])

  if (!focusedQuestionId || messages.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 mb-6">
          <Bot size={14} className="text-gray-400" />
          <h4 className="text-sm font-medium text-gray-500">AI 助教</h4>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Bot size={40} className="text-gray-200 mx-auto mb-4" />
            <p className="text-sm text-gray-300 leading-relaxed">
              回答问题后<br />对话会出现在这里
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Find the question text for the header
  const section = state.outline?.sections?.find(s => s.id === sectionId)
  const question = section?.questions?.find(q => q.id === focusedQuestionId)
  const qIdx = section?.questions?.indexOf(question)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5 flex-shrink-0">
        <Bot size={14} className="text-gray-400" />
        <h4 className="text-sm font-medium text-gray-500">AI 助教</h4>
      </div>

      {/* Question label */}
      {question && (
        <div className="mb-4 px-3 py-2 bg-gray-50 rounded-lg flex-shrink-0">
          <p className="text-xs text-gray-500 mb-0.5">问题 {qIdx + 1}</p>
          <p className="text-xs text-gray-700 line-clamp-2 leading-relaxed">{question.text}</p>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto hide-scrollbar space-y-3 pr-1">
        {messages.map((msg, idx) => {
          if (msg.role === 'error') {
            return (
              <div key={idx} className="flex gap-2.5 items-start">
                <AlertTriangle size={14} className="text-red-400 flex-shrink-0 mt-1" />
                <div className="bg-red-50 text-red-700 text-sm leading-relaxed rounded-2xl rounded-tl-sm px-4 py-3 break-words">
                  {msg.content}
                </div>
              </div>
            )
          }

          if (msg.role === 'student') {
            return (
              <div key={idx} className="flex gap-2.5 items-start justify-end">
                <div className="bg-gray-800 text-white text-sm leading-relaxed rounded-2xl rounded-tr-sm px-4 py-3 max-w-[85%] break-words">
                  {msg.content.startsWith('data:image') ? (
                    <img src={msg.content} alt="你的作答" className="max-h-28 rounded-lg" />
                  ) : msg.content}
                </div>
                <User size={14} className="text-gray-400 flex-shrink-0 mt-1" />
              </div>
            )
          }

          return (
            <div key={idx} className="flex gap-2.5 items-start">
              <Bot size={14} className="text-gray-400 flex-shrink-0 mt-1" />
              <div className="bg-gray-50 text-gray-700 text-sm leading-relaxed rounded-2xl rounded-tl-sm px-4 py-3 break-words">
                {msg.content}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
