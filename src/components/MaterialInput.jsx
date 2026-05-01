import React, { useState } from 'react'
import { useStudy } from '../stores/StudyContext'
import { generateOutline } from '../services/ai'
import { Sparkles, FileText, Loader2 } from 'lucide-react'

export default function MaterialInput() {
  const { actions } = useStudy()
  const [material, setMaterial] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleGenerate = async () => {
    if (!material.trim()) return

    setLoading(true)
    setError(null)
    actions.setLoading(true)

    try {
      const outline = await generateOutline(material)
      actions.setOutline(outline)
    } catch (err) {
      setError(err.message)
    }

    setLoading(false)
    actions.setLoading(false)
  }

  // Load demo data for quick testing
  const handleLoadDemo = () => {
    const demoOutline = {
      title: 'Python 基础教程',
      sections: [
        {
          id: 's1',
          title: 'Python 简介与环境搭建',
          content: `Python 是一种高级编程语言，以其简洁清晰的语法著称。它由 Guido van Rossum 于 1991 年首次发布。

Python 的核心哲学是"可读性优先"。这意味着 Python 代码看起来就像伪代码一样直观易懂。

## 为什么选择 Python？

1. **语法简洁**：Python 使用缩进来定义代码块，而不是大括号
2. **生态系统丰富**：拥有超过 40 万个第三方包
3. **应用广泛**：从 Web 开发到人工智能，Python 无处不在

## 环境搭建

首先，我们需要安装 Python 解释器。访问 python.org 下载最新版本。

\`\`\`bash
# 检查安装
python --version
# Python 3.12.0
\`\`\`

安装完成后，打开终端输入 \`python\` 即可进入交互式环境。`,
          questions: [
            {
              id: 'q1',
              text: '为什么 Python 使用缩进来定义代码块而不是大括号？这个设计选择背后的理念是什么？',
              type: 'text',
              hint: '思考 Python 的核心哲学',
            },
            {
              id: 'q2',
              text: '用你自己的话解释什么是"交互式环境"，它和运行一个 .py 文件有什么区别？',
              type: 'text',
            },
          ],
        },
        {
          id: 's2',
          title: '变量与数据类型',
          content: `在 Python 中，变量就像是给数据贴上的标签。你不需要提前声明变量的类型，Python 会自动识别。

## 变量赋值

\`\`\`python
name = "Alice"      # 字符串
age = 25            # 整数
height = 1.68       # 浮点数
is_student = True   # 布尔值
\`\`\`

## 基本数据类型

Python 有四种基本数据类型：

- **int（整数）**：\`42\`, \`-7\`, \`0\`
- **float（浮点数）**：\`3.14\`, \`-0.001\`
- **str（字符串）**：\`"hello"\`, \`'world'\`
- **bool（布尔值）**：\`True\`, \`False\`

## 类型转换

\`\`\`python
x = "10"
y = int(x)       # 字符串转整数
z = float(x)     # 字符串转浮点数
s = str(y)       # 整数转字符串
\`\`\`

变量的类型是动态的——你可以随时将一个字符串赋给之前存整数的变量。`,
          questions: [
            {
              id: 'q3',
              text: 'Python 是动态类型语言。请解释：如果 age = 25，然后 age = "二十五"，Python 内部发生了什么？',
              type: 'text',
              hint: '考虑变量名和值的关系',
            },
          ],
        },
        {
          id: 's3',
          title: '函数定义与调用',
          content: `函数是可重用的代码块。在 Python 中，使用 \`def\` 关键字定义函数。

## 基本语法

\`\`\`python
def greet(name):
    """向指定的人问好"""
    return f"Hello, {name}!"

message = greet("Alice")
print(message)  # 输出: Hello, Alice!
\`\`\`

## 参数类型

Python 支持多种参数形式：

\`\`\`python
# 默认参数
def power(base, exp=2):
    return base ** exp

print(power(3))     # 9 (使用默认指数 2)
print(power(3, 3))  # 27

# 关键字参数
def create_user(name, age, city="未知"):
    return {"name": name, "age": age, "city": city}

user = create_user(age=25, name="Bob")
\`\`\`

## 作用域

函数内部定义的变量是局部变量，只能在函数内访问。函数外部定义的变量是全局变量。`,
          questions: [
            {
              id: 'q4',
              text: '请画出以下代码的执行流程图：\ndef add(a, b):\n    return a + b\nresult = add(3, 5)\nprint(result)',
              type: 'canvas',
              hint: '用方框和箭头表示调用关系',
            },
            {
              id: 'q5',
              text: '如果在函数内部给一个全局变量赋值，会发生什么？试举例说明。',
              type: 'text',
            },
          ],
        },
      ],
    }
    actions.setOutline(demoOutline)
  }

  return (
    <div className="flex-1 flex items-center justify-center bg-white">
      <div className="max-w-2xl w-full mx-auto px-8">
        {/* Header */}
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

        {/* Input area */}
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

        {/* Error */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 rounded-lg">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={handleGenerate}
            disabled={!material.trim() || loading}
            className={`
              flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium transition-all
              ${material.trim() && !loading
                ? 'bg-gray-900 text-white hover:bg-gray-800 shadow-lg shadow-gray-900/10'
                : 'bg-gray-100 text-gray-300 cursor-not-allowed'
              }
            `}
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Sparkles size={16} />
            )}
            {loading ? '生成中...' : '生成大纲'}
          </button>

          <div className="h-px w-8 bg-gray-200" />

          <button
            onClick={handleLoadDemo}
            disabled={loading}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors underline underline-offset-2"
          >
            加载示例数据
          </button>
        </div>
      </div>
    </div>
  )
}
