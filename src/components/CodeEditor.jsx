import { useState, useRef, useEffect } from 'react'
import { useTheme } from '../context/ThemeContext'
import { supabase } from '../config/supabaseClient'
import Prism from 'prismjs'
import 'prismjs/components/prism-jsx'
import '../styles/prism-theme.css'

export default function CodeEditor({ segmentType = 'component', initialContent = '', title = 'Untitled' }) {
  const [content, setContent] = useState(initialContent)
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [isFocused, setIsFocused] = useState(false)
  const [highlightedContent, setHighlightedContent] = useState('')
  const editorRef = useRef(null)
  const { theme } = useTheme()

  // Update syntax highlighting
  useEffect(() => {
    const highlighted = Prism.highlight(content, Prism.languages.jsx, 'jsx')
    setHighlightedContent(highlighted)
  }, [content])

  const saveContent = async () => {
    try {
      setSaving(true)
      setError(null)

      // Get the user's ID for the storage path
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError

      if (!user) {
        throw new Error('No authenticated user found')
      }

      // Check if a code segment with this title already exists
      const { data: existingSegments, error: queryError } = await supabase
        .from('code_segments')
        .select('id, file_path')
        .eq('user_id', user.id)
        .eq('title', title)
        .single()

      if (queryError && queryError.code !== 'PGRST116') { // PGRST116 is "not found" error
        throw queryError
      }

      // Generate a unique filename for the code segment
      const timestamp = new Date().getTime()
      const filename = `${user.id}/${segmentType}/${title.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.jsx`

      // Upload code to storage bucket
      const { error: uploadError } = await supabase.storage
        .from('code-segments')
        .upload(filename, content, {
          contentType: 'text/jsx',
          upsert: true
        })

      if (uploadError) throw uploadError

      // If old file exists, delete it from storage
      if (existingSegments?.file_path) {
        const { error: deleteError } = await supabase.storage
          .from('code-segments')
          .remove([existingSegments.file_path])

        if (deleteError) {
          console.error('Error deleting old file:', deleteError)
          // Continue anyway as this is not critical
        }
      }

      // Save metadata to code_segments table
      const { error: dbError } = await supabase
        .from('code_segments')
        .upsert({
          ...(existingSegments?.id ? { id: existingSegments.id } : {}),
          user_id: user.id,
          segment_type: segmentType,
          title: title,
          file_path: filename,
          language: 'jsx',
          is_public: false,
          updated_at: new Date().toISOString()
        })
        .select()

      if (dbError) throw dbError

    } catch (err) {
      console.error('Error saving code:', err)
      setError(err.message || 'Failed to save code')
    } finally {
      setSaving(false)
    }
  }

  const handleInput = (e) => {
    const newContent = e.target.value
    setContent(newContent)
    
    // Get cursor position
    const textBeforeCursor = newContent.slice(0, e.target.selectionStart)
    const line = (textBeforeCursor.match(/\n/g) || []).length + 1
    const lastNewLine = textBeforeCursor.lastIndexOf('\n')
    const column = lastNewLine === -1 ? textBeforeCursor.length + 1 : textBeforeCursor.length - lastNewLine

    setCursorPosition({ line, column })
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
      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = start + 2
      }, 0)
    }

    // Handle Save (Ctrl+Shift+S)
    if (e.key === 'S' && e.ctrlKey && e.shiftKey) {
      e.preventDefault()
      saveContent()
    }
  }

  // Generate line numbers
  const lineCount = (content.match(/\n/g) || []).length + 1
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1)

  const editorStyles = {
    lineHeight: '1.5rem',
    padding: '0.5rem 0.75rem',
    margin: 0,
    fontFamily: 'inherit',
    fontSize: 'inherit',
  }

  return (
    <div className={`${theme.editor.background} rounded-lg shadow-lg p-4 font-mono text-sm`}>
      {/* Status bar */}
      <div className={`${theme.editor.statusBar} mb-2 px-2 py-1 rounded flex justify-between items-center text-xs`}>
        <div className="flex items-center gap-4">
          <span>JSX</span>
          <button
            onClick={saveContent}
            className={`${theme.button} px-2 py-1 rounded text-white hover:opacity-90 transition-opacity`}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          {error && <span className="text-red-500">{error}</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs opacity-60">(Ctrl+Shift+S)</span>
          <span>Line {cursorPosition.line}, Column {cursorPosition.column}</span>
        </div>
      </div>

      <div className="relative">
        {/* Editor container */}
        <div className="flex">
          {/* Line numbers */}
          <div 
            className={`${theme.editor.lineNumbers} text-right select-none border-r ${theme.editor.border}`}
            style={editorStyles}
          >
            {lineNumbers.map(num => (
              <div key={num} style={{ height: '1.5rem' }}>
                {num}
              </div>
            ))}
          </div>

          {/* Code input area */}
          <div className="flex-1 relative overflow-auto">
            <div className="relative min-h-full">
              {/* Highlighted code display */}
              <pre 
                aria-hidden="true"
                className="absolute top-0 left-0 m-0 w-full pointer-events-none"
                style={editorStyles}
              >
                <code 
                  className="language-jsx block"
                  dangerouslySetInnerHTML={{ __html: highlightedContent }}
                />
              </pre>

              {/* Actual textarea for editing */}
              <textarea
                ref={editorRef}
                value={content}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className={`w-full h-full ${theme.editor.text} bg-transparent resize-none outline-none`}
                spellCheck="false"
                style={{
                  ...editorStyles,
                  color: 'transparent',
                  caretColor: isFocused ? '#A0AEC0' : 'transparent',
                  minHeight: '100%',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
