import React, { useState, useEffect } from 'react'
import { useTheme } from '../context/ThemeContext'

export default function PreviewPane({ code }) {
  const [element, setElement] = useState(null)
  const [error, setError] = useState(null)
  const { theme } = useTheme()

  useEffect(() => {
    try {
      setError(null)
      setElement(null)

      if (!code) return

      // Only evaluate if code contains React.createElement
      if (!code.includes('React.createElement')) {
        setError('Preview only available for React.createElement code')
        return
      }

      // Create an async function to enable ES6 features
      const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor
      
      // Create a new Function in an isolated scope
      const evaluateCode = new AsyncFunction(
        'React',
        `
          try {
            ${code}
            // Since we know the format, directly execute elem function
            if (typeof elem === 'function') {
              return elem()
            }
            throw new Error('Code must define an elem function')
          } catch (e) {
            throw e
          }
        `
      )

      // Execute the function with React as the only available global
      evaluateCode(React)
        .then(result => {
          if (React.isValidElement(result)) {
            setElement(result)
          } else {
            throw new Error('Invalid React element returned')
          }
        })
        .catch(err => {
          console.error('Preview error:', err)
          setError(err.message || 'Failed to render preview')
        })
    } catch (err) {
      console.error('Preview error:', err)
      setError(err.message || 'Failed to render preview')
    }
  }, [code])

  return (
    <div className={`${theme.nav} rounded-lg`}>
      <div className={`h-full w-full p-4 ${theme.editor.background} ${theme.text}`}>
        {error ? (
          <div className={`p-4 rounded ${theme.error}`}>
            {error}
          </div>
        ) : element ? (
          <div className="preview-content">
            {element}
          </div>
        ) : (
          <div className={`text-center ${theme.secondaryText}`}>
            No preview available
          </div>
        )}
      </div>
    </div>
  )
}
