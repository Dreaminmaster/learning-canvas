import React, { useState } from 'react'
import { StudyProvider, useStudy } from './stores/StudyContext'
import Sidebar from './components/Sidebar'
import MaterialInput from './components/MaterialInput'
import ContentEditor from './components/ContentEditor'
import ApiConfigModal from './components/ApiConfigModal'
import { Loader2 } from 'lucide-react'

function AppContent() {
  const [showSettings, setShowSettings] = useState(false)
  const { state } = useStudy()
  const { outline, hydrated } = state

  // Show loading while restoring from IndexedDB
  if (!hydrated) {
    return (
      <div className="flex h-screen w-full bg-white items-center justify-center">
        <Loader2 size={24} className="animate-spin text-gray-300" />
      </div>
    )
  }

  return (
    <div className="flex h-screen w-full bg-white">
      <Sidebar onOpenSettings={() => setShowSettings(true)} />
      {outline ? <ContentEditor /> : <MaterialInput />}
      {showSettings && <ApiConfigModal onClose={() => setShowSettings(false)} />}
    </div>
  )
}

export default function App() {
  return (
    <StudyProvider>
      <AppContent />
    </StudyProvider>
  )
}
