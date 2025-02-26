import { useState, useEffect, useRef } from 'react'
import { supabase } from './config/supabaseClient'
import AuthForm from './components/AuthForm'
import Profile from './components/Profile'
import ConfirmEmail from './components/ConfirmEmail'
import CodeEditor from './components/CodeEditor'
import PreviewPane from './components/PreviewPane' // Import PreviewPane component
import { ThemeProvider, useTheme } from './context/ThemeContext'

function Dashboard({ session }) {
  const [showProfile, setShowProfile] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [username, setUsername] = useState('')
  const [showEditor, setShowEditor] = useState(true)
  const [previewCode, setPreviewCode] = useState('')
  const [editorTitle, setEditorTitle] = useState('Code Editor')
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleSaving, setTitleSaving] = useState(false)
  const dropdownRef = useRef(null)
  const titleInputRef = useRef(null)
  const { theme, currentTheme, toggleTheme } = useTheme()

  useEffect(() => {
    async function fetchUsername() {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', session.user.id)
          .single()
        
        if (profile?.username) {
          setUsername(profile.username)
        }
      } catch (error) {
        console.error('Error fetching username:', error)
      }
    }
    fetchUsername()
  }, [session])

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus()
    }
  }, [isEditingTitle])

  useEffect(() => {
    async function loadSavedContent() {
      if (!session?.user?.id) return;
      
      try {
        const { data: savedContent, error } = await supabase
          .from('code_segments')
          .select('file_path')
          .eq('user_id', session.user.id)
          .eq('segment_type', 'component')
          .single();

        if (error && error.code !== 'PGRST116') throw error;
        
        if (savedContent?.file_path) {
          // Download the code content
          const { data, error: downloadError } = await supabase.storage
            .from('code-segments')
            .download(savedContent.file_path)

          if (downloadError) throw downloadError;

          // Read the file content
          const content = await data.text();
          // setContent(content);
        }
      } catch (error) {
        console.error('Error loading content:', error, data);
      }
    }
    loadSavedContent();
  }, [session]);

  useEffect(() => {
    async function loadSavedTitle() {
      if (!session?.user?.id) return;
      
      try {
        const { data: savedTitle, error } = await supabase
          .from('code_segments')
          .select('title')
          .eq('user_id', session.user.id)
          .eq('segment_type', 'component')
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') throw error;
        
        if (savedTitle?.title) {
          setEditorTitle(savedTitle.title);
        }
      } catch (error) {
        console.error('Error loading title:', error);
      }
    }
    loadSavedTitle();
  }, [session]);

  const handleLogout = () => {
    supabase.auth.signOut()
  }

  const handlePreviewCodeUpdate = (code) => {
    setPreviewCode(code)
  }

  const saveTitle = async (newTitle) => {
    if (titleSaving || !session?.user?.id) return;
    setTitleSaving(true);
    try {
      // First check if a code segment exists
      const { data: existingSegment, error: queryError } = await supabase
        .from('code_segments')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('segment_type', 'component')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (queryError && queryError.code !== 'PGRST116') throw queryError;

      if (!existingSegment) {
        // No existing segment, create one
        const { error: insertError } = await supabase
          .from('code_segments')
          .insert({
            user_id: session.user.id,
            segment_type: 'component',
            title: newTitle,
            language: 'jsx',
            is_public: false,
            updated_at: new Date().toISOString()
          });

        if (insertError) throw insertError;
      } else {
        // Update existing segment
        const { error: updateError } = await supabase
          .from('code_segments')
          .update({ 
            title: newTitle,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingSegment.id);

        if (updateError) throw updateError;
      }

      setEditorTitle(newTitle);
    } catch (error) {
      console.error('Error saving title:', error);
    } finally {
      setTitleSaving(false);
    }
  };

  const handleTitleChange = (e) => {
    const newTitle = e.target.value;
    setEditorTitle(newTitle);
  };

  const handleTitleFinish = () => {
    setIsEditingTitle(false);
    saveTitle(editorTitle);
  };

  return (
    <div className={`min-h-screen ${theme.background} transition-colors duration-200`}>
      <nav className={`${theme.nav} shadow-lg`}>
        <div className="container mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className={`text-2xl font-semibold ${theme.text}`}>
                A Different Notion
              </span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg ${theme.toggleButton} transition-colors duration-200 hover:opacity-80`}
                aria-label={`Switch to ${currentTheme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {currentTheme === 'dark' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-white">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                  </svg>
                )}
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className={`flex items-center ${theme.text} hover:opacity-80`}
                >
                  <span className="mr-2">@{username || 'user'}</span>
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                {showDropdown && (
                  <div
                    ref={dropdownRef}
                    className={`absolute right-0 mt-2 w-48 rounded-md shadow-lg ${theme.editor.background} ring-1 ring-black ring-opacity-5 z-50`}
                  >
                    <div className="py-1">
                      <button
                        onClick={() => setShowProfile(true)}
                        className={`block w-full text-left px-4 py-2 text-sm ${theme.text} ${theme.toggleButton}`}
                      >
                        Profile Settings
                      </button>
                      <button
                        onClick={handleLogout}
                        className={`block w-full text-left px-4 py-2 text-sm ${theme.text} ${theme.toggleButton}`}
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-6 py-8">
        {showProfile ? (
          <Profile session={session} onClose={() => setShowProfile(false)} />
        ) : (
          <div>
            <h2 className={`text-2xl font-bold ${theme.text} mb-4`}>
              Welcome, @{username || 'user'}
            </h2>
            <div className={`p-6 ${theme.editor.background} rounded-lg shadow-lg`}>
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  {isEditingTitle ? (
                    <input
                      ref={titleInputRef}
                      type="text"
                      value={editorTitle}
                      onChange={handleTitleChange}
                      onBlur={handleTitleFinish}
                      onKeyDown={(e) => e.key === 'Enter' && handleTitleFinish()}
                      className={`text-lg font-semibold ${theme.text} bg-transparent border-b border-current outline-none`}
                    />
                  ) : (
                    <h3 className={`text-lg font-semibold ${theme.text} flex items-center gap-2`}>
                      {editorTitle}
                      {titleSaving && (
                        <span className="text-xs opacity-60">(Saving...)</span>
                      )}
                    </h3>
                  )}
                  <button
                    onClick={() => setIsEditingTitle(true)}
                    className={`p-1 opacity-60 hover:opacity-100 transition-opacity`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${theme.text}`} viewBox="0 0 20 20" fill="currentColor">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </button>
                </div>
                <button
                  onClick={() => setShowEditor(!showEditor)}
                  className={`p-2 text-sm ${theme.text} opacity-60 hover:opacity-100 transition-all duration-200 flex items-center gap-1 rounded`}
                >
                  <span>{showEditor ? 'Hide' : 'Show'} Editor</span>
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className={`h-4 w-4 transition-transform duration-200 ${showEditor ? 'rotate-180' : ''}`}
                    viewBox="0 0 20 20" 
                    fill="currentColor"
                  >
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              <div className="space-y-4">
                {showEditor && (
                  <div className="editor-container">
                    <CodeEditor 
                      segmentType="component"
                      onPreviewCodeChange={handlePreviewCodeUpdate}
                    />
                  </div>
                )}
                <PreviewPane code={previewCode} />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function App() {
  const [session, setSession] = useState(null)
  const [isEmailConfirmed, setIsEmailConfirmed] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        setIsEmailConfirmed(!!session.user.email_confirmed_at || !!session.user.confirmed_at)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) {
        setIsEmailConfirmed(!!session.user.email_confirmed_at || !!session.user.confirmed_at)
      } else {
        setIsEmailConfirmed(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <ThemeProvider>
      {!session ? (
        <AuthForm />
      ) : !isEmailConfirmed ? (
        <ConfirmEmail />
      ) : (
        <Dashboard session={session} />
      )}
    </ThemeProvider>
  )
}

export default App
