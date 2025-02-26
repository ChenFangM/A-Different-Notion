import React, { createContext, useContext, useState } from 'react'

const themes = {
  light: {
    background: 'bg-gradient-to-br from-blue-50 to-indigo-50',
    nav: 'bg-white',
    button: 'bg-blue-600 hover:bg-blue-700',
    text: 'text-gray-900',
    secondaryText: 'text-gray-700',
    toggleButton: 'bg-indigo-100 hover:bg-indigo-200',
    editor: {
      background: 'bg-white',
      text: 'text-gray-900',
      border: 'border-gray-200',
      lineNumbers: 'text-gray-400',
      cursor: 'border-black'
    }
  },
  dark: {
    background: 'bg-slate-900',
    nav: 'bg-slate-800',
    button: 'bg-emerald-500 hover:bg-emerald-600',
    text: 'text-white',
    secondaryText: 'text-gray-200',
    toggleButton: 'bg-slate-700 hover:bg-slate-600',
    editor: {
      background: 'bg-slate-800',
      text: 'text-gray-100',
      border: 'border-slate-600',
      lineNumbers: 'text-gray-500',
      cursor: 'border-white'
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
