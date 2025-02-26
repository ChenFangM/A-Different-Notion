import React, { useState, useEffect, useRef } from 'react'
import { useTheme } from '../context/ThemeContext'
import { supabase } from '../config/supabaseClient'
import Prism from 'prismjs'
import 'prismjs/components/prism-jsx'

export default function CodeEditor({ segmentType = 'component', onPreviewCodeChange }) {
  const [content, setContent] = useState('')
  const [highlightedContent, setHighlightedContent] = useState('')
  const [previewCode, setPreviewCode] = useState('')
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 })
  const [isFocused, setIsFocused] = useState(false)
  const editorRef = useRef(null)
  const codeRef = useRef(null)
  const { theme, currentTheme } = useTheme()

  // Load saved code
  useEffect(() => {
    async function loadSavedCode() {
      try {
        setError(null)
        // Get the user's ID
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError) throw userError

        if (!user) {
          throw new Error('No authenticated user found')
        }

        // Get the most recent code segment
        const { data: segment, error: queryError } = await supabase
          .from('code_segments')
          .select('file_path')
          .eq('user_id', user.id)
          .eq('segment_type', segmentType)
          .order('updated_at', { ascending: false })
          .limit(1)
          .single()

        if (queryError && queryError.code !== 'PGRST116') { // PGRST116 is "not found" error
          throw queryError
        }

        if (segment?.file_path) {
          // Download the code content
          const { data, error: downloadError } = await supabase.storage
            .from('code-segments')
            .download(segment.file_path)

          if (downloadError) throw downloadError

          // Read the file content
          const content = await data.text()
          setContent(content)
          setPreviewCode(content)
        } else {
          // Set default code for new segments
          const defaultCode = `function elem() {
  return React.createElement(
    'div',
    { style: { padding: '20px', textAlign: 'center' } },
    React.createElement(
      'h2',
      { style: { marginBottom: '10px' } },
      'Welcome to Code Editor'
    ),
    React.createElement(
      'p',
      null,
      'Start editing to create your component'
    )
  )
}`
          setContent(defaultCode)
          setPreviewCode(defaultCode)
        }
      } catch (err) {
        console.error('Error loading saved code:', err)
        setError('Failed to load saved code')
      }
    }

    loadSavedCode()
  }, [segmentType])

  // Pass preview code to parent
  useEffect(() => {
    if (onPreviewCodeChange) {
      onPreviewCodeChange(previewCode)
    }
  }, [previewCode, onPreviewCodeChange])

  // Update highlighted content when code changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const highlighted = Prism.highlight(content, Prism.languages.jsx, 'jsx')
      setHighlightedContent(highlighted)
      setPreviewCode(content)
    }, 50)

    return () => clearTimeout(timeoutId)
  }, [content])

  const handleContentChange = (e) => {
    const newContent = e.target.value
    setContent(newContent)
    updateCursorPosition(e.target)
  }

  const handleScroll = (e) => {
    if (codeRef.current) {
      codeRef.current.scrollTop = e.target.scrollTop
      codeRef.current.scrollLeft = e.target.scrollLeft
    }
  }

  const handleKeyDown = (e) => {
    // Handle Tab
    if (e.key === 'Tab') {
      e.preventDefault()
      const start = e.target.selectionStart
      const end = e.target.selectionEnd
      const newContent = content.substring(0, start) + '  ' + content.substring(end)
      setContent(newContent)
      // Move cursor after tab
      requestAnimationFrame(() => {
        e.target.selectionStart = e.target.selectionEnd = start + 2
      })
    }

    // Handle Save (Ctrl+Shift+S)
    if (e.key === 'S' && e.ctrlKey && e.shiftKey) {
      e.preventDefault()
      saveContent()
    }
  }

  const updateCursorPosition = (element) => {
    const textBeforeCursor = element.value.substring(0, element.selectionStart)
    const lines = textBeforeCursor.split('\n')
    const line = lines.length
    const column = lines[lines.length - 1].length + 1
    setCursorPosition({ line, column })
  }

  const saveContent = async () => {
    try {
      setSaving(true)
      setError(null)

      // Get the user's ID
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError

      if (!user) {
        throw new Error('No authenticated user found')
      }

      // Generate filename with timestamp
      const timestamp = new Date().getTime()
      const filename = `${user.id}/${segmentType}/${timestamp}.jsx`

      // Upload code to storage bucket
      const { error: uploadError } = await supabase.storage
        .from('code-segments')
        .upload(filename, content, {
          contentType: 'text/jsx',
          upsert: true
        })

      if (uploadError) throw uploadError

      // Save metadata to code_segments table
      const { error: dbError } = await supabase
        .from('code_segments')
        .insert({
          user_id: user.id,
          segment_type: segmentType,
          title: 'Code Editor', 
          file_path: filename,
          language: 'jsx',
          is_public: false,
          updated_at: new Date().toISOString()
        })

      if (dbError) throw dbError

      setError(null)
    } catch (err) {
      console.error('Error saving code:', err)
      setError(err.message || 'Failed to save code')
    } finally {
      setSaving(false)
    }
  }

  // Generate line numbers
  const lines = content.split('\n')
  const lineNumbers = Array.from({ length: Math.max(lines.length, 1) }, (_, i) => i + 1)

  return (
    <div className="flex flex-col h-full">
      {/* Editor Title Bar */}
      <div className={`flex items-center justify-between px-4 py-2 ${theme.editor.background} border-b ${theme.editor.border}`}>
        <div className="flex items-center">
          <span className={`text-sm ${theme.text}`}>
            JSX Editor
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={saveContent}
            className={`px-2 py-1 text-xs rounded ${theme.button} text-white transition-colors`}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Editor Content */}
      <div className="relative flex-1 flex">
        {/* Line Numbers */}
        <div 
          className={`select-none w-12 text-right pr-2 pt-4 ${theme.editor.background} ${theme.editor.lineNumbers}`}
          style={{
            fontFamily: "'Fira Code', Consolas, Monaco, monospace",
            lineHeight: 1.5,
          }}
        >
          {lineNumbers.map(num => (
            <div key={num} className="select-none">
              {num}
            </div>
          ))}
        </div>

        {/* Code Editor */}
        <div className="relative flex-1">
          <div className="absolute inset-0">
            <textarea
              ref={editorRef}
              value={content}
              onChange={handleContentChange}
              onKeyDown={handleKeyDown}
              onScroll={handleScroll}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              spellCheck="false"
              className={`w-full h-full resize-none outline-none p-4 bg-transparent text-transparent font-mono`}
              style={{ 
                fontFamily: "'Fira Code', Consolas, Monaco, monospace",
                lineHeight: 1.5,
                tabSize: 4,
                caretColor: theme.editor.carat
              }}
            />
          </div>
          <pre 
            ref={codeRef}
            className={`w-full h-full overflow-auto p-4 pointer-events-none`}
            style={{ 
              fontFamily: "'Fira Code', Consolas, Monaco, monospace",
              lineHeight: 1.5,
              tabSize: 4
            }}
          >
            <code 
              className={`language-jsx ${currentTheme === 'dark' ? 'dark' : 'light'}`}
              dangerouslySetInnerHTML={{ __html: highlightedContent }}
            />
          </pre>
        </div>
      </div>

      {/* Status Bar */}
      <div className={`px-4 py-1 text-xs ${theme.editor.statusBar}`}>
        Line {cursorPosition.line}, Column {cursorPosition.column}
      </div>
    </div>
  )
}
