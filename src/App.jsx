import React, { useState } from 'react'
import { StudyProvider, useStudy } from './stores/StudyContext'
import Sidebar from './components/Sidebar'
import MaterialInput from './components/MaterialInput'
import ContentEditor from './components/ContentEditor'
import ApiConfigModal from './components/ApiConfigModal'

function AppContent() {
  const [showSettings, setShowSettings] = useState(false)
  const { state } = useStudy()
  const { outline } = state

  return (
    <div className="flex h-screen w-full bg-white">
      {/* Sidebar */}
      <Sidebar onOpenSettings={() => setShowSettings(true)} />

      {/* Main area */}
      {outline ? (
        <ContentEditor />
      ) : (
        <MaterialInput />
      )}

      {/* Settings modal */}
      {showSettings && (
        <ApiConfigModal onClose={() => setShowSettings(false)} />
      )}
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
