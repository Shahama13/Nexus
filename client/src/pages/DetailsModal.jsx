import { useEffect, useState } from "react"
import { useUIStore } from "../store/uiStore"
import { User, Users, X, Search, Plus } from "lucide-react"
import { deleteGroupChat, getGroupChatDetails, removeParticipant, addParticipant, searchUsers } from "../services/chat"
import { useAuth } from "../store/auth"
import '../styles/DetailsModal.scss'

const AVATAR_COLORS = ['#6C63FF', '#A78BFA', '#F472B6', '#FB923C', '#38BDF8', '#34D399', '#FACC15']

function getAvatarColor(id = '') {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export default function DetailsModal() {
    const { isDetailsModal, setIsDetailsModalOpen, setChatDetailId, chatDetailId } =
        useUIStore()
    const { user, users, setUsers } =
        useAuth()

    const [groupChat, setGroupChat] = useState(null)
    const [showAddParticipants, setShowAddParticipants] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedUsers, setSelectedUsers] = useState([])

    const handleClose = () => {
        setIsDetailsModalOpen(false)
        setChatDetailId("")
        setGroupChat(null)
        setShowAddParticipants(false)
        setSearchQuery("")
        setSelectedUsers([])
    }

    useEffect(() => {
        if (!chatDetailId) return

        getGroupChatDetails(chatDetailId).then((r) => {
            setGroupChat(r.data.groupChat[0])
        })
    }, [chatDetailId])

    useEffect(() => {
        if (users.length === 0) {
            searchUsers().then((r) => {
                setUsers(r.data.users)
            })
        }
    }, [users.length])

    const handleDeleteGroup = () => {
        deleteGroupChat(chatDetailId).then((r) => {
            handleClose()
        })
    }

    const handleRemoveParticipant = (participantId) => {
        removeParticipant(chatDetailId, participantId).then((r) => {
            // Refresh group details
            getGroupChatDetails(chatDetailId).then((res) => {
                setGroupChat(res.data.groupChat[0])
            })
        })
    }

    const handleAddParticipants = () => {
        if (selectedUsers.length === 0) return

        Promise.all(
            selectedUsers.map(userId => addParticipant(chatDetailId, userId))
        ).then(() => {
            // Refresh group details
            getGroupChatDetails(chatDetailId).then((res) => {
                setGroupChat(res.data.groupChat[0])
                setShowAddParticipants(false)
                setSelectedUsers([])
                setSearchQuery("")
            })
        })
    }

    const toggleUserSelection = (userId) => {
        setSelectedUsers(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        )
    }

    // Get users not in the group
    const availableUsers = users.filter(u =>
        !groupChat?.participants.some(p => p._id === u._id) &&
        u._id !== user._id
    )

    // Filter available users by search query
    const filteredUsers = availableUsers.filter(u =>
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // Helper function to get initials from name
    const getInitials = (name) => {
        return name?.charAt(0)?.toUpperCase() || "U"
    }

    if (!isDetailsModal || !groupChat) return null

    return (
        <div className="details-modal-overlay">
            <div className="details-modal-backdrop" onClick={handleClose} />

            <div className="details-modal">
                <button onClick={handleClose} className="details-close-btn">
                    <X size={20} />
                </button>

                {!showAddParticipants ? (
                    <>
                        {/* Group Details View */}
                        <div className="group-summary">
                            <div className="group-avatar">
                                <Users size={32} />
                            </div>

                            <h2 className="group-name">{groupChat.name}</h2>

                            <p className="group-meta">
                                Group · {groupChat.participants.length} participants
                            </p>
                        </div>

                        <div className="participants-section">
                            <div className="participants-heading">
                                <Users size={18} />
                                <h3>{groupChat.participants.length} Participants</h3>
                            </div>

                            <div className="participants-list">
                                {groupChat.participants.map((p) => (
                                    <div key={p._id} className="participant-row">
                                        <div className="participant-left">
                                            <div 
                                                className="participant-avatar"
                                                style={{ background: getAvatarColor(p._id) }}
                                            >
                                                {getInitials(p.name)}
                                            </div>

                                            <div>
                                                <div className="participant-name-row">
                                                    <p className="participant-name">{p.name}</p>

                                                    {groupChat.admin === p._id && (
                                                        <span className="admin-badge">admin</span>
                                                    )}
                                                </div>

                                                <p className="participant-email">{p.email}</p>
                                            </div>
                                        </div>

                                        {
                                            user._id.toString() === groupChat.admin.toString() && groupChat.admin !== p._id && (
                                                <button
                                                    onClick={() => handleRemoveParticipant(p._id)}
                                                    className="remove-btn"
                                                >
                                                    Remove
                                                </button>
                                            )
                                        }
                                    </div>
                                ))}
                            </div>
                        </div>

                        {user._id.toString() === groupChat.admin.toString() && (
                            <div className="admin-actions">
                                <button
                                    onClick={() => setShowAddParticipants(true)}
                                    className="add-participant-btn"
                                >
                                    <Users size={18} />
                                    Add participant
                                </button>

                                <button onClick={handleDeleteGroup} className="delete-group-btn">
                                    Delete group
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        {/* Add Participants View */}
                        <div className="add-participants-view">
                            <h2 className="add-participants-title">Add Participants</h2>
                            <p className="add-participants-subtitle">
                                Select users to add to {groupChat.name}
                            </p>

                            {/* Search Bar */}
                            <div className="details-search-wrapper">
                                <Search size={18} className="details-search-icon" />
                                <input
                                    type="text"
                                    placeholder="Search users..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="details-search-input"
                                />
                            </div>

                            {/* Selected Count */}
                            {selectedUsers.length > 0 && (
                                <div className="selected-count">
                                    {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected
                                </div>
                            )}

                            {/* Available Users List */}
                            <div className="available-users-list">
                                {filteredUsers.length === 0 ? (
                                    <div className="available-users-empty">
                                        {searchQuery ? 'No users found' : 'No available users to add'}
                                    </div>
                                ) : (
                                    filteredUsers.map((u) => (
                                        <div
                                            key={u._id}
                                            onClick={() => toggleUserSelection(u._id)}
                                            className={`available-user-row ${selectedUsers.includes(u._id) ? 'selected' : ''}`}
                                        >
                                            <div className="participant-left">
                                                <div 
                                                    className="participant-avatar"
                                                    style={{ background: getAvatarColor(u._id) }}
                                                >
                                                    {getInitials(u.name)}
                                                </div>
                                                <div>
                                                    <p className="participant-name">{u.name}</p>
                                                    <p className="participant-email">{u.email}</p>
                                                </div>
                                            </div>
                                            {selectedUsers.includes(u._id) && (
                                                <div className="selected-check">
                                                    <svg className="check-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="add-participants-actions">
                            <button
                                onClick={handleAddParticipants}
                                disabled={selectedUsers.length === 0}
                                className="add-btn"
                            >
                                <Plus size={18} />
                                Add {selectedUsers.length > 0 ? `(${selectedUsers.length})` : ''}
                            </button>
                            <button
                                onClick={() => {
                                    setShowAddParticipants(false)
                                    setSelectedUsers([])
                                    setSearchQuery("")
                                }}
                                className="cancel-add-btn"
                            >
                                Cancel
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}