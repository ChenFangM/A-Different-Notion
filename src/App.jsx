import { useState, useEffect, useRef } from 'react'
import { supabase } from './config/supabaseClient'
import AuthForm from './components/AuthForm'
import Profile from './components/Profile'
import ConfirmEmail from './components/ConfirmEmail'
import CodeEditor from './components/CodeEditor'
import { ThemeProvider, useTheme } from './context/ThemeContext'

function Dashboard({ session }) {
  const [showProfile, setShowProfile] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [username, setUsername] = useState('')
  const dropdownRef = useRef(null)
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

  return (
    <div className={`min-h-screen ${theme.background} transition-colors duration-200`}>
      <nav className={`${theme.nav} shadow transition-colors duration-200`}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <h1 className={`text-2xl font-bold ${theme.text}`}>
              A Different Notion
            </h1>
            <div className="flex items-center space-x-4">
              <button
                className={`px-4 py-2 rounded-lg ${theme.toggleButton} transition-colors duration-200 ${theme.secondaryText}`}
                onClick={toggleTheme}
              >
                {currentTheme === 'contrast' ? 'Switch to Pastel' : 'Switch to High Contrast'}
              </button>
              
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded hover:bg-opacity-10 hover:bg-gray-500 transition-colors ${theme.secondaryText}`}
                >
                  <span>@{username || 'user'}</span>
                  <svg className={`w-5 h-5 transition-transform ${showDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showDropdown && (
                  <div className={`absolute right-0 mt-2 w-48 ${theme.nav} rounded-lg shadow-lg py-1 z-10`}>
                    <button
                      onClick={() => {
                        setShowProfile(true)
                        setShowDropdown(false)
                      }}
                      className={`w-full text-left px-4 py-2 ${theme.secondaryText} hover:bg-opacity-10 hover:bg-gray-500 transition-colors`}
                    >
                      Profile Settings
                    </button>
                    <button
                      onClick={() => supabase.auth.signOut()}
                      className="w-full text-left px-4 py-2 text-red-600 hover:bg-opacity-10 hover:bg-gray-500 transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto py-6 px-4">
        {showProfile ? (
          <div>
            <button
              onClick={() => setShowProfile(false)}
              className={`mb-4 ${theme.secondaryText} hover:opacity-75 flex items-center transition-opacity`}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </button>
            <Profile session={session} />
          </div>
        ) : (
          <div className="space-y-6">
            <h2 className={`text-2xl font-bold ${theme.text} mb-4`}>
              Welcome, @{username || 'user'}
            </h2>
            <div className={`p-6 ${theme.nav} rounded-lg shadow-lg`}>
              <h3 className={`text-lg font-semibold ${theme.text} mb-4`}>Code Editor</h3>
              <CodeEditor />
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
