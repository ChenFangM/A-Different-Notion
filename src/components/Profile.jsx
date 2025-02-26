import { useState, useEffect } from 'react'
import { supabase } from '../config/supabaseClient'
import { useTheme } from '../context/ThemeContext'

export default function Profile({ session }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [username, setUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const { theme } = useTheme()

  useEffect(() => {
    getProfile()
  }, [session])

  const validateUsername = (username) => {
    if (username.length < 3) {
      throw new Error('Username must be at least 3 characters')
    }
    if (username.length > 20) {
      throw new Error('Username must be at most 20 characters')
    }
    if (!/^[a-zA-Z0-9]+$/.test(username)) {
      throw new Error('Username can only contain letters and numbers')
    }
    return true
  }

  const getProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', session.user.id)
        .single()

      if (error) throw error
      setUsername(data.username)
    } catch (error) {
      console.error('Error loading profile:', error)
    }
  }

  const updateUsername = async () => {
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      // Validate username
      validateUsername(username)

      // Check if username is already taken
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .neq('id', session.user.id)
        .single()

      if (existingUser) {
        throw new Error('Username is already taken')
      }

      // Update username in profiles table
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ username, updated_at: null })
        .eq('id', session.user.id)

      if (updateError) throw updateError

      setSuccess('Username updated successfully')
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const updatePassword = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      if (newPassword.length < 6) {
        throw new Error('Password must be at least 6 characters')
      }
      if (newPassword !== confirmNewPassword) {
        throw new Error('Passwords do not match')
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) throw error

      setNewPassword('')
      setConfirmNewPassword('')
      setSuccess('Password updated successfully')
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const deleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      setError('Please type DELETE to confirm account deletion')
      return
    }

    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      // Call RPC function to delete profile and mark user as deleted
      const { error: deleteError } = await supabase.rpc('delete_user_account', {
        user_id: session.user.id
      })

      if (deleteError) {
        console.error('Delete error:', deleteError)
        throw new Error('Failed to delete account: ' + deleteError.message)
      }

      // Sign out after successful deletion
      await supabase.auth.signOut()
    } catch (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  return (
    <div className={`p-6 rounded-lg shadow-lg ${theme.editor.background} ${theme.text}`}>
      <h2 className={`text-2xl font-bold mb-6 ${theme.text}`}>Profile Settings</h2>

      {error && (
        <div className={`mt-4 p-4 rounded ${theme.error}`}>
          {error}
        </div>
      )}
      {success && (
        <div className="mt-4 p-4 rounded bg-green-100 text-green-900">
          {success}
        </div>
      )}

      <div className="mb-8">
        <h3 className={`text-xl font-semibold mb-4 ${theme.secondaryText}`}>Username</h3>
        <div className="flex gap-4">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={`flex-1 px-4 py-2 rounded border ${theme.editor.border} ${theme.editor.background} ${theme.text}`}
          />
          <button
            onClick={updateUsername}
            disabled={loading}
            className={`px-4 py-2 rounded ${theme.button} text-white font-medium`}
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="mb-8">
        <h3 className={`text-xl font-semibold mb-4 ${theme.secondaryText}`}>Change Password</h3>
        <div className="space-y-4">
          <div>
            <input
              type={showPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New Password"
              className={`w-full px-4 py-2 rounded border ${theme.editor.border} ${theme.editor.background} ${theme.text}`}
            />
          </div>
          <div>
            <input
              type={showPassword ? "text" : "password"}
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              placeholder="Confirm New Password"
              className={`w-full px-4 py-2 rounded border ${theme.editor.border} ${theme.editor.background} ${theme.text}`}
            />
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={updatePassword}
              disabled={loading}
              className={`px-4 py-2 rounded ${theme.button} text-white font-medium`}
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
                className="rounded"
              />
              <span className={theme.secondaryText}>Show password</span>
            </label>
          </div>
        </div>
      </div>

      <div>
        <h3 className={`text-xl font-semibold mb-4 ${theme.secondaryText}`}>Delete Account</h3>
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white font-medium"
          >
            Delete Account
          </button>
        ) : (
          <div className="space-y-4">
            <p className={`${theme.text}`}>
              To confirm deletion, please type "delete my account" below:
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className={`w-full px-4 py-2 rounded border ${theme.editor.border} ${theme.editor.background} ${theme.text}`}
            />
            <div className="flex gap-4">
              <button
                onClick={deleteAccount}
                disabled={loading || deleteConfirmText !== 'DELETE'}
                className={`px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white font-medium ${
                  (loading || deleteConfirmText !== 'DELETE') && 'opacity-50 cursor-not-allowed'
                }`}
              >
                {loading ? 'Deleting...' : 'Confirm Delete'}
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setDeleteConfirmText('')
                }}
                className={`px-4 py-2 rounded ${theme.button} text-white font-medium`}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
