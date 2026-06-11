import React, { useState } from 'react'
import { User, MessageSquare, LogOut, Camera, ChevronRight, Check, X } from 'lucide-react'
import { logout } from '../../services/auth'
import { useAuth } from '../../store/auth'

export default function MyProfile() {
  const { clearUser, user } = useAuth()
  const [username, setUsername] = useState(user.email.split("@")[0])
  const [name, setName] = useState(user.name)
  const [about, setAbout] = useState('Hey there! I am using ConvoX.')

  const [editingField, setEditingField] = useState(null)
  const [tempValue, setTempValue] = useState('')

  const handleLogout = () => {
    logout()
    clearUser()
  }

  const handleEdit = (field, currentValue) => {
    setEditingField(field)
    setTempValue(currentValue)
  }

  const handleSave = (field) => {
    if (field === 'name') setName(tempValue)
    if (field === 'username') setUsername(tempValue)
    if (field === 'about') setAbout(tempValue)
    setEditingField(null)
    setTempValue('')
  }

  const handleCancel = () => {
    setEditingField(null)
    setTempValue('')
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900 h-screen">
      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-6 space-y-4">
          {/* Profile Avatar Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 flex justify-center">
            <div className="relative">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-4xl font-bold">
                {name.charAt(0).toUpperCase()}
              </div>
              <button className="absolute bottom-2 right-2 w-10 h-10 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center text-white transition-colors shadow-lg">
                <Camera size={20} />
              </button>
            </div>
          </div>

          {/* Profile Fields */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Name Field */}
            <div className="p-5 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-start gap-4">
                <div className="text-gray-600 dark:text-gray-400 mt-1">
                  <User size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  {editingField === 'name' ? (
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-2">Name</label>
                      <input
                        type="text"
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        className="w-full bg-transparent border-0 text-gray-900 dark:text-white text-base focus:outline-none p-0"
                        autoFocus
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        This is your display name that others will see.
                      </p>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleSave('name')}
                          className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                        >
                          <Check size={18} />
                        </button>
                        <button
                          onClick={handleCancel}
                          className="p-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Name</label>
                      <p className="text-gray-900 dark:text-white text-base">{name}</p>
                    </div>
                  )}
                </div>
                {editingField !== 'name' && (
                  <button
                    onClick={() => handleEdit('name', name)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-400 transition-colors"
                  >
                    {/* Edit icon removed but button retained for future use */}
                  </button>
                )}
              </div>
            </div>

            {/* Username Field */}
            <div className="p-5 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-start gap-4">
                <div className="text-gray-600 dark:text-gray-400 mt-1">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  {editingField === 'username' ? (
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-2">Username</label>
                      <div className="flex items-center">
                        <span className="text-gray-500 dark:text-gray-400 mr-1">@</span>
                        <input
                          type="text"
                          value={tempValue}
                          onChange={(e) => setTempValue(e.target.value)}
                          className="flex-1 bg-transparent border-0 text-gray-900 dark:text-white text-base focus:outline-none p-0"
                          autoFocus
                        />
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Your unique username for identification.
                      </p>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleSave('username')}
                          className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                        >
                          <Check size={18} />
                        </button>
                        <button
                          onClick={handleCancel}
                          className="p-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Username</label>
                      <p className="text-gray-900 dark:text-white text-base">@{username}</p>
                    </div>
                  )}
                </div>
                {editingField !== 'username' && (
                  <button
                    onClick={() => handleEdit('username', username)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-400 transition-colors"
                  >
                    {/* Edit icon removed but button retained for future use */}
                  </button>
                )}
              </div>
            </div>

            {/* About Field */}
            <div className="p-5">
              <div className="flex items-start gap-4">
                <div className="text-gray-600 dark:text-gray-400 mt-1">
                  <MessageSquare size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  {editingField === 'about' ? (
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-2">About</label>
                      <textarea
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        rows={3}
                        className="w-full bg-transparent border-0 text-gray-900 dark:text-white text-base focus:outline-none p-0 resize-none"
                        autoFocus
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        This will be visible to your contacts.
                      </p>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleSave('about')}
                          className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                        >
                          <Check size={18} />
                        </button>
                        <button
                          onClick={handleCancel}
                          className="p-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">About</label>
                      <p className="text-gray-900 dark:text-white text-base">{about}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full bg-white dark:bg-gray-800 rounded-xl border border-red-200 dark:border-red-900/50 p-5 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 group"
          >
            <div className="flex items-center gap-4">
              <div className="text-red-600 dark:text-red-400">
                <LogOut size={22} />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-semibold text-red-600 dark:text-red-400">Logout</h3>
                <p className="text-sm text-red-500 dark:text-red-400/80">Sign out of your account</p>
              </div>
              <ChevronRight size={20} className="text-red-400 group-hover:text-red-600 dark:group-hover:text-red-300 transition-colors" />
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}