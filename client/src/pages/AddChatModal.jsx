import { useCallback, useEffect, useState } from "react"
import { useUIStore } from "../store/uiStore"
import { Search, User, Users, X } from "lucide-react"
import { newGroupChat, newUserChat, searchUsers } from "../services/chat"
import { useAuth } from "../store/auth"



// Add Chat Modal Component
export default function AddChatModal() {
  const { isAddChatModalOpen, setIsAddChatModalOpen } = useUIStore()
  const [groupName, setGroupName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUsers, setSelectedUsers] = useState([])
  const [isGroup, setIsGroup] = useState(false)
  const { users, setUsers } = useAuth()

  const filteredUsers = users?.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase())||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getUsers = async () => {
    const { data } = await searchUsers()
    setUsers(data.users)
  }

  const handleClose = () => {
    setIsAddChatModalOpen(false)
    setGroupName('')
    setSearchQuery('')
    setSelectedUsers([])
    setIsGroup(false)
  }

  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleCreate = async() => {
    // Add your chat creation logic here

    if(isGroup){
     newGroupChat(groupName, [...selectedUsers])
    }
    else{

     await Promise.allSettled(selectedUsers.map((userId)=> newUserChat(userId)))
      
    }
    handleClose()
  }

  if (!isAddChatModalOpen) return null

  const selectedUserObjects = users?.filter(u => selectedUsers.includes(u._id))

  useEffect(() => {
    if (isAddChatModalOpen && users.length === 0) {
      getUsers()
    }
  }, [isAddChatModalOpen, users.length])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-600/20 flex items-center justify-center">
              <Users className="text-blue-400" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                New {isGroup ? 'Group' : 'Chat'}
              </h2>
              <p className="text-xs text-slate-400">
                {isGroup ? 'Create a group conversation' : 'Start a direct message'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-slate-800 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Chat Type Toggle */}
          <div className="flex gap-2 p-1 bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setIsGroup(false)}
              className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${!isGroup
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-300'
                }`}
            >
              <User size={16} />
              Direct
            </button>
            <button
              type="button"
              onClick={() => setIsGroup(true)}
              className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${isGroup
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-300'
                }`}
            >
              <Users size={16} />
              Group
            </button>
          </div>

          {/* Group Name Input */}
          {isGroup && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Group name
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Enter a group name..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              />
            </div>
          )}

          {/* User Search & Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              {isGroup ? 'Select group participants...' : 'Select participant...'}
            </label>

            {/* Search Input */}
            <div className="relative mb-3">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              />
            </div>

            {/* User List */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl max-h-60 overflow-y-auto">
              {filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">
                  No users found
                </div>
              ) : (
                filteredUsers.map(user => (
                  <div
                    key={user._id}
                    onClick={() => toggleUserSelection(user._id)}
                    className={`flex items-center gap-3 p-3 cursor-pointer transition-colors border-b border-slate-700/50 last:border-b-0 ${selectedUsers.includes(user._id)
                      ? 'bg-blue-600/10'
                      : 'hover:bg-slate-750'
                      }`}
                  >
                    <div className="relative">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                        {user.avatar}
                      </div>
                      {user.online && (
                        <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-slate-800" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white text-sm">
                        {user.name}
                      </div>
                      <div className="text-xs text-slate-400">
                        {user.email}
                      </div>
                    </div>
                    <div className={`h-5 w-5 rounded-md border-2 flex items-center justify-center transition-all ${selectedUsers.includes(user._id)
                      ? 'bg-blue-600 border-blue-600'
                      : 'border-slate-600'
                      }`}>
                      {selectedUsers.includes(user._id) && (
                        <svg className="w-3 h-3 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
                          <path d="M5 13l4 4L19 7"></path>
                        </svg>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Selected Participants */}
          {selectedUserObjects.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Users size={14} className="text-slate-400" />
                <span className="text-xs font-medium text-slate-400">
                  Selected participants ({selectedUserObjects.length})
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedUserObjects.map(user => (
                  <div
                    key={user._id}
                    className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-full pl-1 pr-3 py-1"
                  >
                    <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-xs">
                      {user.avatar}
                    </div>
                    <span className="text-xs text-white font-medium">
                      {user.name}
                    </span>
                    <button
                      onClick={() => toggleUserSelection(user._id)}
                      className="text-slate-400 hover:text-white transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Button */}
          <button
            type="button"
            onClick={handleCreate}
            disabled={selectedUsers.length === 0 || (isGroup && !groupName.trim())}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded-xl px-4 py-3.5 text-sm font-semibold transition-all shadow-lg shadow-blue-600/30 hover:shadow-blue-600/40 disabled:shadow-none"
          >
            Create {isGroup ? 'Group' : 'Chat'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Main ChatList Component