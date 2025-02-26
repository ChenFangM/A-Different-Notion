import { useState } from 'react'
import { supabase } from '../config/supabaseClient'
import { useTheme } from '../context/ThemeContext'

function validateUsername(username) {
  if (!username) throw new Error('Username is required')
  if (username.length < 3) throw new Error('Username must be at least 3 characters')
  if (username.length > 20) throw new Error('Username must be less than 20 characters')
  if (!/^[a-zA-Z0-9_]+$/.test(username)) throw new Error('Username can only contain letters, numbers, and underscores')
}

export default function AuthForm() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [formData, setFormData] = useState({
    emailOrUsername: '',
    username: '',
    password: '',
    confirmPassword: ''
  })
  const { theme } = useTheme()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (isSignUp) {
        // Validate password
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match')
          setLoading(false)
          return
        }
        if (formData.password.length < 6) {
          setError('Password must be at least 6 characters')
          setLoading(false)
          return
        }

        // Validate email
        if (!formData.emailOrUsername.includes('@')) {
          setError('Please enter a valid email address')
          setLoading(false)
          return
        }

        // Check if email already exists
        const { data: emailStatus, error: emailCheckError } = await supabase
          .rpc('check_email_status', {
            p_email: formData.emailOrUsername
          })

        if (emailCheckError) {
          console.error('Email check error:', emailCheckError)
          setError('Error checking email availability')
          setLoading(false)
          return
        }

        if (emailStatus.exists) {
          setError('An account with this email already exists')
          setLoading(false)
          return
        }

        // Validate username
        try {
          validateUsername(formData.username)
        } catch (error) {
          setError(`Invalid username: ${error.message}`)
          setLoading(false)
          return
        }

        // Check username availability
        const { data: available, error: checkError } = await supabase
          .rpc('check_username_available', {
            p_username: formData.username
          })

        if (checkError) {
          console.error('Username check error:', checkError)
          setError('Error checking username availability')
          setLoading(false)
          return
        }

        if (!available) {
          setError('Username is not available')
          setLoading(false)
          return
        }

        console.log('Creating user account with email:', formData.emailOrUsername)
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: formData.emailOrUsername,
          password: formData.password,
          options: {
            data: {
              username: formData.username
            }
          }
        })

        if (signUpError) {
          console.error('Signup error:', signUpError)
          setError(signUpError.message.includes('valid email') 
            ? 'Please enter a valid email address'
            : 'Failed to create account: ' + signUpError.message)
          setLoading(false)
          return
        }

        if (!data?.user?.id) {
          console.error('No user ID returned from signup')
          setError('Failed to create account')
          setLoading(false)
          return
        }

        console.log('Creating profile for user:', data.user.id)
        // Create profile with username using RPC to bypass RLS
        const { error: profileError } = await supabase
          .rpc('create_new_profile', {
            p_user_id: data.user.id,
            p_username: formData.username
          })

        if (profileError) {
          console.error('Profile creation error:', profileError)
          setError('Failed to create profile: ' + profileError.message)
          setLoading(false)
          return
        }

        console.log('Profile created successfully')
        setError('Please check your email for confirmation link')
        setLoading(false)
      } else {
        // Login logic
        let email = formData.emailOrUsername

        // If input doesn't look like an email, try to get email by username
        if (!email.includes('@')) {
          console.log('Attempting to login with username:', email)
          const { data: userEmail, error: emailError } = await supabase
            .rpc('get_email_by_username', {
              p_username: email.trim()
            })

          if (emailError) {
            console.error('Error finding account:', emailError)
            setError('Error finding account. Please try again.')
            setLoading(false)
            return
          }

          if (!userEmail) {
            console.log('No email found for username:', email)
            setError('Username not found. Please check your username or sign in with email.')
            setLoading(false)
            return
          }

          console.log('Found email for username:', email)
          email = userEmail
        }

        console.log('Attempting login with email:', email)
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email,
          password: formData.password,
        })

        if (signInError) {
          console.error('Sign in error:', signInError)
          setError('Invalid login credentials')
          setLoading(false)
          return
        }
      }
    } catch (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  return (
    <div className={`min-h-screen ${theme.background} flex items-center justify-center p-6 transition-colors duration-200`}>
      <div className={`${theme.nav} rounded-2xl shadow-xl w-full max-w-md p-8 space-y-8`}>
        <div className="text-center space-y-2">
          <h1 className={`text-3xl font-bold ${theme.text}`}>
            A Different Notion
          </h1>
          <p className={theme.secondaryText}>
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className={`block text-sm font-medium ${theme.secondaryText} mb-1`} htmlFor="emailOrUsername">
              {isSignUp ? 'Email' : 'Email or Username'}
            </label>
            <input
              id="emailOrUsername"
              type={isSignUp ? "email" : "text"}
              value={formData.emailOrUsername}
              onChange={(e) => setFormData({ ...formData, emailOrUsername: e.target.value })}
              className={`w-full px-4 py-3 rounded-lg border ${theme.editor.border} bg-transparent ${theme.text} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors`}
              placeholder={isSignUp ? "you@example.com" : "Email or username"}
              required
            />
          </div>

          {isSignUp && (
            <div>
              <label className={`block text-sm font-medium ${theme.secondaryText} mb-1`} htmlFor="username">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className={`w-full px-4 py-3 rounded-lg border ${theme.editor.border} bg-transparent ${theme.text} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors`}
                placeholder="Choose a username"
                required
              />
            </div>
          )}

          <div>
            <label className={`block text-sm font-medium ${theme.secondaryText} mb-1`} htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className={`w-full px-4 py-3 rounded-lg border ${theme.editor.border} bg-transparent ${theme.text} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors`}
              placeholder={isSignUp ? "Create a password" : "Enter your password"}
              required
            />
          </div>

          {isSignUp && (
            <div>
              <label className={`block text-sm font-medium ${theme.secondaryText} mb-1`} htmlFor="confirmPassword">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className={`w-full px-4 py-3 rounded-lg border ${theme.editor.border} bg-transparent ${theme.text} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors`}
                placeholder="Confirm your password"
                required
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full ${theme.button} text-white py-3 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : (
              isSignUp ? 'Create Account' : 'Sign In'
            )}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp)
                setError(null)
                setFormData({
                  emailOrUsername: '',
                  username: '',
                  password: '',
                  confirmPassword: ''
                })
              }}
              className={`text-blue-600 hover:text-blue-700 text-sm font-medium focus:outline-none`}
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
