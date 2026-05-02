import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react'
import { saveState, loadState, clearState } from '../services/storage'

const StudyContext = createContext(null)

const initialState = {
  outline: null,
  currentSectionIndex: 0,
  chatMessages: {},
  studentAnswers: {},
  loading: false,
  error: null,
  hydrated: false, // true after loading from IndexedDB
}

function studyReducer(state, action) {
  switch (action.type) {
    case 'HYDRATE':
      return {
        ...state,
        outline: action.payload.outline || state.outline,
        currentSectionIndex: action.payload.currentSectionIndex ?? state.currentSectionIndex,
        chatMessages: action.payload.chatMessages || state.chatMessages,
        studentAnswers: action.payload.studentAnswers || state.studentAnswers,
        hydrated: true,
      }

    case 'SET_OUTLINE':
      return { ...state, outline: action.payload, error: null, currentSectionIndex: 0 }

    case 'SET_CURRENT_SECTION':
      return { ...state, currentSectionIndex: action.payload }

    case 'ADD_CHAT_MESSAGE': {
      const { sectionId, message } = action.payload
      const existing = state.chatMessages[sectionId] || []
      return {
        ...state,
        chatMessages: {
          ...state.chatMessages,
          [sectionId]: [...existing, { ...message, timestamp: Date.now() }],
        },
      }
    }

    case 'SET_STUDENT_ANSWER': {
      const { questionId, answer, feedback, status } = action.payload
      const prev = state.studentAnswers[questionId] || { attempts: 0 }
      return {
        ...state,
        studentAnswers: {
          ...state.studentAnswers,
          [questionId]: { answer, feedback, status: status || 'unknown', attempts: prev.attempts + 1 },
        },
      }
    }

    case 'CLEAR_ANSWER': {
      const newAnswers = { ...state.studentAnswers }
      delete newAnswers[action.payload.questionId]
      return { ...state, studentAnswers: newAnswers }
    }

    case 'UPDATE_SECTION_CONTENT': {
      const { sectionId, content } = action.payload
      if (!state.outline) return state
      const updatedSections = state.outline.sections.map(s =>
        s.id === sectionId ? { ...s, content } : s
      )
      return { ...state, outline: { ...state.outline, sections: updatedSections } }
    }

    case 'SET_LOADING':
      return { ...state, loading: action.payload }

    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false }

    case 'CLEAR_ALL':
      return { ...initialState, hydrated: true }

    default:
      return state
  }
}

export function StudyProvider({ children }) {
  const [state, dispatch] = useReducer(studyReducer, initialState)

  // Load from IndexedDB on mount
  useEffect(() => {
    loadState().then((saved) => {
      if (saved.outline) {
        dispatch({ type: 'HYDRATE', payload: saved })
      } else {
        dispatch({ type: 'HYDRATE', payload: {} })
      }
    })
  }, [])

  // Save to IndexedDB on relevant state changes
  useEffect(() => {
    if (!state.hydrated) return
    if (!state.outline) return
    saveState({
      outline: state.outline,
      studentAnswers: state.studentAnswers,
      chatMessages: state.chatMessages,
      currentSectionIndex: state.currentSectionIndex,
    })
  }, [state.outline, state.studentAnswers, state.chatMessages, state.currentSectionIndex, state.hydrated])

  const actions = {
    setOutline: useCallback((outline) => dispatch({ type: 'SET_OUTLINE', payload: outline }), []),
    setCurrentSection: useCallback((index) => dispatch({ type: 'SET_CURRENT_SECTION', payload: index }), []),
    addChatMessage: useCallback((sectionId, message) =>
      dispatch({ type: 'ADD_CHAT_MESSAGE', payload: { sectionId, message } }), []),
    setStudentAnswer: useCallback((questionId, answer, feedback, status) =>
      dispatch({ type: 'SET_STUDENT_ANSWER', payload: { questionId, answer, feedback, status } }), []),
    clearAnswer: useCallback((questionId) =>
      dispatch({ type: 'CLEAR_ANSWER', payload: { questionId } }), []),
    updateSectionContent: useCallback((sectionId, content) =>
      dispatch({ type: 'UPDATE_SECTION_CONTENT', payload: { sectionId, content } }), []),
    setLoading: useCallback((loading) => dispatch({ type: 'SET_LOADING', payload: loading }), []),
    setError: useCallback((error) => dispatch({ type: 'SET_ERROR', payload: error }), []),
    clearAll: useCallback(async () => {
      await clearState()
      dispatch({ type: 'CLEAR_ALL' })
    }, []),
  }

  return (
    <StudyContext.Provider value={{ state, actions }}>
      {children}
    </StudyContext.Provider>
  )
}

export function useStudy() {
  const ctx = useContext(StudyContext)
  if (!ctx) throw new Error('useStudy must be used within StudyProvider')
  return ctx
}

export function useCurrentSection() {
  const { state } = useStudy()
  if (!state.outline) return null
  return state.outline.sections[state.currentSectionIndex] || null
}
