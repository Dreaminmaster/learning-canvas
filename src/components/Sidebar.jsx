import React from 'react'
import { useStudy } from '../stores/StudyContext'
import { Settings, BookOpen, ChevronRight } from 'lucide-react'

export default function Sidebar({ onOpenSettings }) {
  const { state, actions } = useStudy()
  const { outline, currentSectionIndex } = state

  if (!outline) {
    return (
      <div className="w-1/5 border-r border-gray-100 flex flex-col h-full bg-white p-6">
        <div className="flex items-center gap-2 mb-6">
          <BookOpen size={18} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-400">Learning Outline</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-gray-300 text-center leading-relaxed">
            上传学习资料<br />生成学习大纲
          </p>
        </div>
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          <Settings size={14} />
          API 设置
        </button>
      </div>
    )
  }

  const completionPercent = Math.round(
    ((currentSectionIndex + 1) / outline.sections.length) * 100
  )

  return (
    <div className="w-1/5 border-r border-gray-100 flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <BookOpen size={16} className="text-gray-400" />
          <span className="text-xs text-gray-300">{completionPercent}%</span>
        </div>
        <h2 className="font-semibold text-sm text-gray-800 leading-tight line-clamp-2">
          {outline.title}
        </h2>
      </div>

      {/* Progress bar */}
      <div className="px-6 pb-4">
        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gray-800 rounded-full transition-all duration-500"
            style={{ width: `${completionPercent}%` }}
          />
        </div>
      </div>

      {/* Outline list */}
      <div className="flex-1 overflow-y-auto px-4 hide-scrollbar">
        <nav className="space-y-0.5">
          {outline.sections.map((section, index) => {
            const isActive = index === currentSectionIndex
            const isPast = index < currentSectionIndex
            const hasFeedback = Object.keys(state.studentAnswers).some(
              qId => section.questions?.some(q => q.id === qId) && state.studentAnswers[qId]
            )

            return (
              <button
                key={section.id}
                onClick={() => actions.setCurrentSection(index)}
                className={`
                  w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all
                  flex items-center gap-2 group
                  ${isActive
                    ? 'bg-gray-100 text-gray-900 font-medium'
                    : isPast
                      ? 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                <span className={`
                  w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0
                  ${isActive
                    ? 'bg-gray-800 text-white'
                    : isPast && hasFeedback
                      ? 'bg-green-100 text-green-600'
                      : isPast
                        ? 'bg-gray-200 text-gray-500'
                        : 'bg-gray-100 text-gray-400'
                  }
                `}>
                  {isPast && hasFeedback ? '✓' : index + 1}
                </span>
                <span className="truncate flex-1">{section.title}</span>
                {isActive && (
                  <ChevronRight size={14} className="text-gray-400 flex-shrink-0" />
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-50">
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 transition-colors w-full"
        >
          <Settings size={14} />
          API 设置
        </button>
      </div>
    </div>
  )
}
