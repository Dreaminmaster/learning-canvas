import React, { createContext, useContext, useReducer, useCallback } from 'react'

const StudyContext = createContext(null)

// Initial state
const initialState = {
  outline: null,           // { title, sections: [...] }
  currentSectionIndex: 0,  // which section the user is viewing
  chatMessages: {},        // { [sectionId]: [{ role, content, timestamp }] }
  studentAnswers: {},      // { [questionId]: { answer, feedback, attempts } }
  loading: false,
  error: null,
}

// Actions
function studyReducer(state, action) {
  switch (action.type) {
    case 'SET_OUTLINE':
      return { ...state, outline: action.payload, error: null }

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
      const { questionId, answer, feedback } = action.payload
      const prev = state.studentAnswers[questionId] || { attempts: 0 }
      return {
        ...state,
        studentAnswers: {
          ...state.studentAnswers,
          [questionId]: {
            answer,
            feedback,
            attempts: prev.attempts + 1,
          },
        },
      }
    }

    case 'SET_LOADING':
      return { ...state, loading: action.payload }

    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false }

    case 'CLEAR_ALL':
      return { ...initialState }

    default:
      return state
  }
}

export function StudyProvider({ children }) {
  const [state, dispatch] = useReducer(studyReducer, initialState)

  const actions = {
    setOutline: useCallback((outline) => dispatch({ type: 'SET_OUTLINE', payload: outline }), []),
    setCurrentSection: useCallback((index) => dispatch({ type: 'SET_CURRENT_SECTION', payload: index }), []),
    addChatMessage: useCallback((sectionId, message) =>
      dispatch({ type: 'ADD_CHAT_MESSAGE', payload: { sectionId, message } }), []),
    setStudentAnswer: useCallback((questionId, answer, feedback) =>
      dispatch({ type: 'SET_STUDENT_ANSWER', payload: { questionId, answer, feedback } }), []),
    setLoading: useCallback((loading) => dispatch({ type: 'SET_LOADING', payload: loading }), []),
    setError: useCallback((error) => dispatch({ type: 'SET_ERROR', payload: error }), []),
    clearAll: useCallback(() => dispatch({ type: 'CLEAR_ALL' }), []),
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
