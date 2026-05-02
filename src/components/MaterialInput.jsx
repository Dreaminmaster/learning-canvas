import React, { useState } from 'react'
import { useStudy } from '../stores/StudyContext'
import { generateOutline } from '../services/ai'
import { Sparkles, FileText, Loader2 } from 'lucide-react'

const STEP_LABELS = {
  skeleton: '正在分析资料，提取章节骨架...',
  content: '正在生成第 {n}/{total} 章内容...',
  questions: '正在为第 {n}/{total} 章出题...',
}

export default function MaterialInput() {
  const { actions } = useStudy()
  const [material, setMaterial] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [progress, setProgress] = useState(null) // { step, chapterIndex, total }

  const handleGenerate = async () => {
    if (!material.trim()) return
    setLoading(true)
    setError(null)

    try {
      const outline = await generateOutline(material, (step, chapterIndex, total) => {
        setProgress({ step, chapterIndex, total })
      })
      actions.setOutline(outline)
    } catch (err) {
      setError(err.message)
    }

    setLoading(false)
    setProgress(null)
  }

  const handleLoadDemo = () => {
    const demoOutline = {
      title: 'Python 基础教程',
      sections: [
        {
          id: 's1', title: 'Python 简介与环境搭建',
          content: `Python 是一种高级编程语言，以其简洁清晰的语法著称。它由 Guido van Rossum 于 1991 年首次发布。

Python 的核心哲学是"可读性优先"。这意味着 Python 代码看起来就像伪代码一样直观易懂。

## 为什么选择 Python？

1. **语法简洁**：Python 使用缩进来定义代码块，而不是大括号
2. **生态系统丰富**：拥有超过 40 万个第三方包
3. **应用广泛**：从 Web 开发到人工智能，Python 无处不在

## 环境搭建

\`\`\`bash
python --version
# Python 3.12.0
\`\`\`

安装完成后，打开终端输入 \`python\` 即可进入交互式环境。`,
          questions: [
            { id: 'q1', text: '为什么 Python 使用缩进来定义代码块而不是大括号？', type: 'text', hint: '思考 Python 的核心哲学' },
            { id: 'q2', text: '用你自己的话解释什么是"交互式环境"，它和运行 .py 文件有什么区别？', type: 'text' },
          ],
        },
        {
          id: 's2', title: '变量与数据类型',
          content: `在 Python 中，变量就像是给数据贴上的标签。你不需要提前声明变量的类型，Python 会自动识别。

## 变量赋值

\`\`\`python
name = "Alice"
age = 25
height = 1.68
is_student = True
\`\`\`

## 基本数据类型

- **int（整数）**：\`42\`, \`-7\`, \`0\`
- **float（浮点数）**：\`3.14\`, \`-0.001\`
- **str（字符串）**：\`"hello"\`, \`'world'\`
- **bool（布尔值）**：\`True\`, \`False\`

变量的类型是动态的——你可以随时将一个字符串赋给之前存整数的变量。`,
          questions: [
            { id: 'q3', text: '如果 age = 25，然后 age = "二十五"，Python 内部发生了什么？', type: 'text', hint: '考虑变量名和值的关系' },
          ],
        },
        {
          id: 's3', title: '函数定义与调用',
          content: `函数是可重用的代码块。在 Python 中，使用 \`def\` 关键字定义函数。

\`\`\`python
def greet(name):
    return f"Hello, {name}!"

message = greet("Alice")
print(message)  # 输出: Hello, Alice!
\`\`\`

## 参数类型

\`\`\`python
def power(base, exp=2):
    return base ** exp

print(power(3))     # 9
print(power(3, 3))  # 27
\`\`\`

函数内部定义的变量是局部变量，只能在函数内访问。`,
          questions: [
            { id: 'q4', text: '请画出以下代码的执行流程：def add(a,b): return a+b; result = add(3,5)', type: 'canvas', hint: '用方框和箭头' },
            { id: 'q5', text: '如果在函数内部给一个全局变量赋值，会发生什么？', type: 'text' },
          ],
        },
      ],
    }
    actions.setOutline(demoOutline)
  }

  const getProgressText = () => {
    if (!progress) return '生成中...'
    const { step, chapterIndex, total } = progress
    const tpl = STEP_LABELS[step] || '生成中...'
    return tpl.replace('{n}', chapterIndex + 1).replace('{total}', total)
  }

  return (
    <div className="flex-1 flex items-center justify-center bg-white">
      <div className="max-w-2xl w-full mx-auto px-8">
        <div className="text-center mb-12">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-6">
            <FileText size={28} className="text-gray-600" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">学习画布</h1>
          <p className="text-sm text-gray-400 max-w-md mx-auto leading-relaxed">
            粘贴你的学习资料，AI 会帮你生成结构化大纲，<br />
            然后用苏格拉底式问答引导你深入理解。
          </p>
        </div>

        <div className="relative">
          <textarea
            value={material}
            onChange={(e) => setMaterial(e.target.value)}
            placeholder={"在此粘贴学习资料...\n\n例如：\n- 一篇 Python 教程\n- 课堂笔记\n- 技术文档\n- 任何你想学习的内容"}
            rows={10}
            className="w-full resize-none outline-none text-sm text-gray-700 placeholder-gray-300 bg-gray-50 rounded-xl p-6 leading-relaxed border border-gray-100 focus:border-gray-200 transition-colors"
            disabled={loading}
          />
          <div className="absolute bottom-3 right-3 text-xs text-gray-300">
            {material.length > 0 && `${material.length} 字`}
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 rounded-lg">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        {/* Progress indicator */}
        {loading && progress && (
          <div className="mt-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex gap-1">
                <span className={`w-2 h-2 rounded-full ${progress.step === 'skeleton' ? 'bg-gray-800 animate-pulse' : 'bg-gray-300'}`} />
                <span className={`w-2 h-2 rounded-full ${progress.step === 'content' ? 'bg-gray-800 animate-pulse' : progress.step === 'questions' ? 'bg-gray-300' : 'bg-gray-200'}`} />
                <span className={`w-2 h-2 rounded-full ${progress.step === 'questions' ? 'bg-gray-800 animate-pulse' : 'bg-gray-200'}`} />
              </div>
              <span className="text-xs text-gray-500">{getProgressText()}</span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={handleGenerate}
            disabled={!material.trim() || loading}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium transition-all ${
              material.trim() && !loading
                ? 'bg-gray-900 text-white hover:bg-gray-800 shadow-lg shadow-gray-900/10'
                : 'bg-gray-100 text-gray-300 cursor-not-allowed'
            }`}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {loading ? '生成中...' : '生成大纲'}
          </button>
          <div className="h-px w-8 bg-gray-200" />
          <button onClick={handleLoadDemo} disabled={loading}
            className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2">
            加载示例数据
          </button>
        </div>
      </div>
    </div>
  )
}
