import React, { useRef, useEffect } from 'react'
import { useStudy } from '../stores/StudyContext'
import { Bot, User, AlertTriangle } from 'lucide-react'

export default function AIChatPanel({ sectionId }) {
  const { state } = useStudy()
  const scrollRef = useRef(null)
  const messages = state.chatMessages[sectionId] || []

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages.length])

  if (messages.length === 0) {
    return (
      <div className="w-1/3 flex flex-col h-full">
        <div className="flex items-center gap-2 mb-4">
          <Bot size={14} className="text-gray-400" />
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">AI 助教</h4>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Bot size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-xs text-gray-300 leading-relaxed">
              回答问题后<br />我会在这里和你对话
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-1/3 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4 flex-shrink-0">
        <Bot size={14} className="text-gray-400" />
        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">AI 助教</h4>
        <span className="text-xs text-gray-300 ml-auto">{messages.length} 条对话</span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto hide-scrollbar space-y-3 pr-1">
        {messages.map((msg, idx) => {
          if (msg.role === 'error') {
            return (
              <div key={idx} className="flex gap-2 items-start">
                <AlertTriangle size={14} className="text-red-400 flex-shrink-0 mt-1" />
                <div className="chat-bubble bg-red-50 text-red-700 text-xs">
                  {msg.content}
                </div>
              </div>
            )
          }

          if (msg.role === 'student') {
            return (
              <div key={idx} className="flex gap-2 items-start justify-end">
                <div className="chat-bubble bg-gray-800 text-white text-xs max-w-[85%]">
                  {msg.content.startsWith('data:image') ? (
                    <img src={msg.content} alt="你的作答" className="max-h-24 rounded" />
                  ) : (
                    msg.content
                  )}
                </div>
                <User size={14} className="text-gray-400 flex-shrink-0 mt-1" />
              </div>
            )
          }

          return (
            <div key={idx} className="flex gap-2 items-start">
              <Bot size={14} className="text-gray-400 flex-shrink-0 mt-1" />
              <div className="chat-bubble bg-gray-50 text-gray-700 text-xs">
                {msg.content}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
