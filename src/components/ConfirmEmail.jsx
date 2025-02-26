import { useState, useEffect } from 'react'
import { supabase } from '../config/supabaseClient'

export default function ConfirmEmail() {
  const [status, setStatus] = useState('checking') // 'checking', 'confirmed', 'unconfirmed'
  const [error, setError] = useState(null)

  useEffect(() => {
    const checkEmailConfirmation = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session?.user) {
          setStatus('unconfirmed')
          return
        }

        // Get user metadata to check email confirmation
        const { data: user, error: userError } = await supabase.rpc('check_user_status', {
          user_id: session.user.id
        })

        if (userError) throw userError

        if (session.user.email_confirmed_at || session.user.confirmed_at) {
          setStatus('confirmed')
        } else {
          setStatus('unconfirmed')
        }
      } catch (error) {
        console.error('Error checking email confirmation:', error)
        setError(error.message)
        setStatus('unconfirmed')
      }
    }

    // Initial check
    checkEmailConfirmation()

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        await checkEmailConfirmation()
      }
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <div className="text-red-600 text-center mb-4">
            Error: {error}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Checking email confirmation status...</p>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'unconfirmed') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h1 className="text-2xl font-bold text-center mb-6">Confirm Your Email</h1>
          <div className="text-center mb-6">
            <p className="text-gray-600 mb-4">
              Please check your email for a confirmation link. Click the link to activate your account.
            </p>
            <p className="text-gray-600">
              Once confirmed, you'll be automatically redirected to the dashboard.
            </p>
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            className="w-full bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600"
          >
            Sign Out
          </button>
        </div>
      </div>
    )
  }

  return null // If confirmed, App.jsx will render the dashboard
}
