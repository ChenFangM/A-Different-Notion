import React, { createContext, useContext, useState } from 'react'

const themes = {
  light: {
    background: 'bg-gradient-to-br from-blue-50 to-indigo-50',
    nav: 'bg-white',
    button: 'bg-blue-400 hover:bg-blue-500',
    'button-text': 'text-white',
    text: 'text-gray-900',
    secondaryText: 'text-gray-700',
    toggleButton: 'bg-indigo-100 hover:bg-indigo-200 text-gray-700',
    error: 'bg-red-50 text-red-900',
    success: 'bg-green-50 text-green-900',
    editor: {
      background: 'bg-white',
      text: 'text-gray-900',
      border: 'border-gray-200',
      lineNumbers: 'text-gray-400',
      carat: 'gray',
      selection: 'bg-blue-200',
      highlight: 'bg-yellow-100',
      statusBar: 'bg-gray-100 text-gray-600',
    }
  },
  dark: {
    background: 'bg-slate-900',
    nav: 'bg-slate-800',
    button: 'bg-blue-300 hover:bg-blue-400',
    'button-text': 'text-slate-900',
    text: 'text-white',
    secondaryText: 'text-gray-200',
    toggleButton: 'bg-slate-700 hover:bg-slate-600 text-white',
    error: 'bg-red-900/20 text-red-200',
    success: 'bg-green-900/20 text-green-200',
    editor: {
      background: 'bg-slate-800',
      text: 'text-gray-100',
      border: 'border-slate-600',
      lineNumbers: 'text-gray-500',
      carat: 'white',
      selection: 'bg-blue-500/30',
      highlight: 'bg-yellow-500/20',
      statusBar: 'bg-gray-700 text-gray-300',
    }
  }
}

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  const [currentTheme, setCurrentTheme] = useState('light')
  const theme = themes[currentTheme]

  const toggleTheme = () => {
    setCurrentTheme(current => current === 'light' ? 'dark' : 'light')
  }

  return (
    <ThemeContext.Provider value={{ theme, currentTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
