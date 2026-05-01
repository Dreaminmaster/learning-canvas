import React, { useRef, useState, useEffect, useCallback } from 'react'
import rough from 'roughjs'
import { Pencil, Eraser, Undo2, Trash2, Send, Image } from 'lucide-react'

const TOOLS = {
  PENCIL: 'pencil',
  ERASER: 'eraser',
}

export default function CanvasDraw({ onSubmit, placeholder = '在此绘图作答...' }) {
  const canvasRef = useRef(null)
  const roughCanvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [tool, setTool] = useState(TOOLS.PENCIL)
  const [paths, setPaths] = useState([])       // Array of path points
  const [currentPath, setCurrentPath] = useState([])
  const [isEmpty, setIsEmpty] = useState(true)

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resize = () => {
      const rect = canvas.parentElement.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = rect.height
      roughCanvasRef.current = rough.canvas(canvas)
      redraw()
    }

    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  // Redraw all paths
  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    const rc = roughCanvasRef.current
    if (!canvas || !rc) return

    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    paths.forEach(path => {
      if (path.tool === TOOLS.ERASER) {
        ctx.globalCompositeOperation = 'destination-out'
        ctx.lineWidth = 20
        ctx.strokeStyle = 'rgba(0,0,0,1)'
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.beginPath()
        path.points.forEach((p, i) => {
          if (i === 0) ctx.moveTo(p.x, p.y)
          else ctx.lineTo(p.x, p.y)
        })
        ctx.stroke()
        ctx.globalCompositeOperation = 'source-over'
      } else {
        // Rough.js hand-drawn style
        if (path.points.length > 1) {
          rc.linearPath(
            path.points.map(p => [p.x, p.y]),
            {
              stroke: '#1a1a1a',
              strokeWidth: 1.5,
              roughness: 0.8,
              bowing: 1,
            }
          )
        }
      }
    })
  }, [paths])

  useEffect(() => {
    redraw()
  }, [paths, redraw])

  const getPos = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    }
  }

  const handleStart = (e) => {
    e.preventDefault()
    setIsDrawing(true)
    const pos = getPos(e)
    setCurrentPath([pos])
  }

  const handleMove = (e) => {
    if (!isDrawing) return
    e.preventDefault()
    const pos = getPos(e)
    setCurrentPath(prev => [...prev, pos])

    // Draw live
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const points = [...currentPath, pos]

    if (tool === TOOLS.ERASER) {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.lineWidth = 20
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.lineWidth = 1.5
      ctx.strokeStyle = '#1a1a1a'
    }
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    if (points.length >= 2) {
      const lastTwo = points.slice(-2)
      ctx.beginPath()
      ctx.moveTo(lastTwo[0].x, lastTwo[0].y)
      ctx.lineTo(lastTwo[1].x, lastTwo[1].y)
      ctx.stroke()
    }
    ctx.globalCompositeOperation = 'source-over'
  }

  const handleEnd = () => {
    if (!isDrawing) return
    setIsDrawing(false)
    if (currentPath.length > 1) {
      setPaths(prev => [...prev, { tool, points: currentPath }])
      setIsEmpty(false)
    }
    setCurrentPath([])
  }

  const handleUndo = () => {
    setPaths(prev => {
      const next = prev.slice(0, -1)
      if (next.length === 0) setIsEmpty(true)
      return next
    })
  }

  const handleClear = () => {
    setPaths([])
    setIsEmpty(true)
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  const handleSubmit = () => {
    const canvas = canvasRef.current
    const dataUrl = canvas.toDataURL('image/png')
    onSubmit?.(dataUrl, 'canvas')
  }

  return (
    <div className="canvas-container">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setTool(TOOLS.PENCIL)}
            className={`p-1.5 rounded-md transition-colors ${
              tool === TOOLS.PENCIL ? 'bg-gray-100 text-gray-800' : 'text-gray-400 hover:text-gray-600'
            }`}
            title="画笔"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => setTool(TOOLS.ERASER)}
            className={`p-1.5 rounded-md transition-colors ${
              tool === TOOLS.ERASER ? 'bg-gray-100 text-gray-800' : 'text-gray-400 hover:text-gray-600'
            }`}
            title="橡皮擦"
          >
            <Eraser size={15} />
          </button>
          <div className="w-px h-4 bg-gray-200 mx-1" />
          <button
            onClick={handleUndo}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 transition-colors"
            title="撤销"
          >
            <Undo2 size={15} />
          </button>
          <button
            onClick={handleClear}
            className="p-1.5 rounded-md text-gray-400 hover:text-red-500 transition-colors"
            title="清空"
          >
            <Trash2 size={15} />
          </button>
        </div>
        <button
          onClick={handleSubmit}
          disabled={isEmpty}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
            isEmpty
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-700 hover:bg-gray-800 hover:text-white bg-gray-100'
          }`}
        >
          <Send size={12} />
          提交
        </button>
      </div>

      {/* Canvas */}
      <div className="relative" style={{ height: 200 }}>
        <canvas
          ref={canvasRef}
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
        />
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-gray-300 text-sm">{placeholder}</p>
          </div>
        )}
      </div>
    </div>
  )
}
