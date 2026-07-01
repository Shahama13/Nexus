import { useCallback, useEffect, useState } from "react"
import { useUIStore } from "../store/uiStore"
import { Search, User, Users, X } from "lucide-react"
import { newGroupChat, newUserChat, searchUsers } from "../services/chat"
import { useAuth } from "../store/auth"
import '../styles/AddChatModal.scss'



// Add Chat Modal Component
export default function AddChatModal() {
  const { isAddChatModalOpen, setIsAddChatModalOpen } = useUIStore()
  const [groupName, setGroupName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUsers, setSelectedUsers] = useState([])
  const [isGroup, setIsGroup] = useState(false)
  const { users, setUsers } = useAuth()

  const filteredUsers = users?.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
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

  const handleCreate = async () => {
  

    if (isGroup) {
      newGroupChat(groupName, [...selectedUsers])
    }
    else {

      await Promise.allSettled(selectedUsers.map((userId) => newUserChat(userId)))

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
    <div className="add-chat-modal-overlay">
      {/* Backdrop */}
      <div className="add-chat-modal-backdrop" onClick={handleClose} />

      {/* Modal */}
      <div className="add-chat-modal">
        {/* Header */}
        <div className="add-chat-modal-header">
          <div className="header-left">
            <div className="header-icon">
              <Users size={20} />
            </div>
            <div>
              <h2 className="header-title">
                New {isGroup ? 'Group' : 'Chat'}
              </h2>
              <p className="header-subtitle">
                {isGroup ? 'Create a group conversation' : 'Start a direct message'}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="close-btn">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="add-chat-modal-body">
          {/* Chat Type Toggle */}
          <div className="chat-type-toggle">
            <button
              type="button"
              onClick={() => setIsGroup(false)}
              className={`toggle-btn ${!isGroup ? 'active' : ''}`}
            >
              <User size={16} />
              Direct
            </button>
            <button
              type="button"
              onClick={() => setIsGroup(true)}
              className={`toggle-btn ${isGroup ? 'active' : ''}`}
            >
              <Users size={16} />
              Group
            </button>
          </div>

          {/* Group Name Input */}
          {isGroup && (
            <div className="field">
              <label className="field-label">Group name</label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Enter a group name..."
                className="text-input"
              />
            </div>
          )}

          {/* User Search & Selection */}
          <div className="field">
            <label className="field-label">
              {isGroup ? 'Select group participants...' : 'Select participant...'}
            </label>

            {/* Search Input */}
            <div className="search-input-wrapper">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users..."
                className="text-input with-icon"
              />
            </div>

            {/* User List */}
            <div className="user-list">
              {filteredUsers.length === 0 ? (
                <div className="user-list-empty">No users found</div>
              ) : (
                filteredUsers.map(user => (
                  <div
                    key={user._id}
                    onClick={() => toggleUserSelection(user._id)}
                    className={`user-row ${selectedUsers.includes(user._id) ? 'selected' : ''}`}
                  >
                    <div className="user-avatar">
                      {user?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="user-details">
                      <div className="user-name">{user.name}</div>
                      <div className="user-email">{user.email}</div>
                    </div>
                    <div className={`user-checkbox ${selectedUsers.includes(user._id) ? 'checked' : ''}`}>
                      {selectedUsers.includes(user._id) && (
                        <svg className="check-icon" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
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
            <div className="selected-participants">
              <div className="selected-participants-label">
                <Users size={14} />
                <span>Selected participants ({selectedUserObjects.length})</span>
              </div>
              <div className="selected-chips">
                {selectedUserObjects.map(user => (
                  <div key={user._id} className="selected-chip">
                    <div className="chip-avatar">{user.avatar}</div>
                    <span className="chip-name">{user.name}</span>
                    <button onClick={() => toggleUserSelection(user._id)} className="chip-remove">
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
            className="create-btn"
          >
            Create {isGroup ? 'Group' : 'Chat'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Main ChatList Component