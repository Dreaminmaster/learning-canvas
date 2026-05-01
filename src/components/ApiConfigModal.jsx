import React, { useState, useEffect } from 'react'
import { getAIConfig, saveAIConfig, listProviders } from '../services/ai'
import { X, Eye, EyeOff, Check } from 'lucide-react'

export default function ApiConfigModal({ onClose }) {
  const [config, setConfig] = useState(getAIConfig())
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved] = useState(false)
  const providers = listProviders()

  const handleSave = () => {
    saveAIConfig(config)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleProviderChange = (providerId) => {
    setConfig(prev => ({ ...prev, provider: providerId, endpoint: '', model: '' }))
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">API 设置</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Provider selector */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">AI 提供商</label>
            <div className="grid grid-cols-2 gap-2">
              {providers.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleProviderChange(p.id)}
                  className={`
                    px-3 py-2 rounded-lg text-sm text-left transition-all
                    ${config.provider === p.id
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }
                  `}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Endpoint */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">
              API Endpoint
              <span className="text-gray-300 ml-1">（可选，留空使用默认值）</span>
            </label>
            <input
              type="text"
              value={config.endpoint}
              onChange={(e) => setConfig(prev => ({ ...prev, endpoint: e.target.value }))}
              placeholder={`https://api.example.com/v1/chat/completions`}
              className="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm outline-none border border-gray-100 focus:border-gray-300 transition-colors"
            />
          </div>

          {/* Model */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">
              模型名称
              <span className="text-gray-300 ml-1">（可选，留空使用默认值）</span>
            </label>
            <input
              type="text"
              value={config.model}
              onChange={(e) => setConfig(prev => ({ ...prev, model: e.target.value }))}
              placeholder="mimo-v1"
              className="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm outline-none border border-gray-100 focus:border-gray-300 transition-colors"
            />
          </div>

          {/* API Key */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">API Key</label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={config.apiKey}
                onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                placeholder="sk-..."
                className="w-full px-3 py-2 pr-10 bg-gray-50 rounded-lg text-sm outline-none border border-gray-100 focus:border-gray-300 transition-colors"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
              >
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <p className="text-xs text-gray-300 mt-1">
              API Key 仅存储在本地浏览器中，不会上传到任何服务器
            </p>
          </div>

          {/* System Prompt */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">
              系统提示词
              <span className="text-gray-300 ml-1">（定义 AI 的教学风格）</span>
            </label>
            <textarea
              value={config.systemPrompt}
              onChange={(e) => setConfig(prev => ({ ...prev, systemPrompt: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 bg-gray-50 rounded-lg text-xs outline-none border border-gray-100 focus:border-gray-300 transition-colors resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
          <span className={`text-xs flex items-center gap-1 transition-opacity ${saved ? 'opacity-100 text-green-600' : 'opacity-0'}`}>
            <Check size={12} /> 已保存
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition-colors"
            >
              保存设置
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
