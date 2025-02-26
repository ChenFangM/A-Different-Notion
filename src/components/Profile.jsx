import { useState, useEffect } from 'react'
import { supabase } from '../config/supabaseClient'

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
    <div className="max-w-2xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6">Profile Settings</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      <div className="mb-8">
        <div className="flex items-center space-x-4">
          <div className="flex-grow">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="username">
              Username
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username (letters and numbers only)"
            />
          </div>
          <button
            onClick={updateUsername}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline h-10 mt-7"
          >
            {loading ? 'Updating...' : 'Update'}
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Only letters and numbers allowed, 3-20 characters
        </p>
      </div>

      <h3 className="text-xl font-bold mb-4">Change Password</h3>
      <form onSubmit={updatePassword} className="mb-8">
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="newPassword">
            New Password
          </label>
          <div className="relative">
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="newPassword"
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 px-3 flex items-center"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="confirmNewPassword">
            Confirm New Password
          </label>
          <div className="relative">
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="confirmNewPassword"
              type={showPassword ? 'text' : 'password'}
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              required
            />
          </div>
        </div>

        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          disabled={loading}
        >
          {loading ? 'Updating...' : 'Update Password'}
        </button>
      </form>

      <div className="border-t pt-8">
        <h3 className="text-xl font-bold mb-4 text-red-600">Delete Account</h3>
        {!showDeleteConfirm ? (
          <button
            type="button"
            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            onClick={() => setShowDeleteConfirm(true)}
          >
            Delete Account
          </button>
        ) : (
          <div>
            <p className="text-gray-700 mb-4">
              This action cannot be undone. Type "DELETE" to confirm:
            </p>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mb-4"
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
            />
            <div className="flex space-x-4">
              <button
                type="button"
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                onClick={deleteAccount}
                disabled={loading}
              >
                {loading ? 'Deleting...' : 'Confirm Delete'}
              </button>
              <button
                type="button"
                className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setDeleteConfirmText('')
                }}
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
