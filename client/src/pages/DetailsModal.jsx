import { useEffect, useState } from "react"
import { useUIStore } from "../store/uiStore"
import { User, Users, X, Search, Plus } from "lucide-react"
import { deleteGroupChat, getGroupChatDetails, removeParticipant, addParticipant, searchUsers } from "../services/chat"
import { useAuth } from "../store/auth"

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

    if (!isDetailsModal || !groupChat) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-end">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={handleClose}
            />

            <div className="relative bg-slate-800 shadow-2xl w-full max-w-md h-full overflow-y-auto">
                <button
                    onClick={handleClose}
                    className="absolute top-6 left-6 z-10 text-slate-400 hover:text-white"
                >
                    <X size={20} />
                </button>

                {!showAddParticipants ? (
                    <>
                        {/* Group Details View */}
                        <div className="flex flex-col items-center pt-12 pb-6 px-6">
                            <div className="w-24 h-24 bg-slate-700 rounded-full flex items-center justify-center mb-4">
                                <Users className="text-slate-400" />
                            </div>

                            <h2 className="text-white text-xl font-semibold">
                                {groupChat.name}
                            </h2>

                            <p className="text-slate-400 text-sm">
                                Group · {groupChat.participants.length} participants
                            </p>
                        </div>

                        <div className="px-6 pb-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Users size={18} className="text-white" />
                                <h3 className="text-white font-medium">
                                    {groupChat.participants.length} Participants
                                </h3>
                            </div>

                            <div className="space-y-3">
                                {groupChat.participants.map((p) => (
                                    <div
                                        key={p._id}
                                        className="flex items-center justify-between bg-slate-700/50 rounded-lg p-3"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-slate-600 rounded-full flex items-center justify-center">
                                                <User size={18} className="text-slate-400" />
                                            </div>

                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-white font-medium">{p.name}</p>

                                                    {groupChat.admin === p._id && (
                                                        <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded">
                                                            admin
                                                        </span>
                                                    )}
                                                </div>

                                                <p className="text-slate-400 text-sm">{p.email}</p>
                                            </div>
                                        </div>

                                        {
                                            user._id.toString() === groupChat.admin.toString() && groupChat.admin !== p._id && (
                                                <button
                                                    onClick={() => handleRemoveParticipant(p._id)}
                                                    className="bg-red-500 hover:bg-red-600 text-white text-sm px-4 py-1.5 rounded-md"
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
                            <div className="px-6 pb-6 space-y-3">
                                <button
                                    onClick={() => setShowAddParticipants(true)}
                                    className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2"
                                >
                                    <Users size={18} />
                                    Add participant
                                </button>

                                <button
                                    onClick={handleDeleteGroup}
                                    className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg font-medium"
                                >
                                    Delete group
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        {/* Add Participants View */}
                        <div className="pt-12 pb-6 px-6">
                            <h2 className="text-white text-xl font-semibold mb-2">
                                Add Participants
                            </h2>
                            <p className="text-slate-400 text-sm mb-6">
                                Select users to add to {groupChat.name}
                            </p>

                            {/* Search Bar */}
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search users..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-slate-700 text-white pl-10 pr-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* Selected Count */}
                            {selectedUsers.length > 0 && (
                                <div className="mb-4 text-sm text-blue-400">
                                    {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected
                                </div>
                            )}

                            {/* Available Users List */}
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {filteredUsers.length === 0 ? (
                                    <div className="text-center py-8 text-slate-400">
                                        {searchQuery ? 'No users found' : 'No available users to add'}
                                    </div>
                                ) : (
                                    filteredUsers.map((u) => (
                                        <div
                                            key={u._id}
                                            onClick={() => toggleUserSelection(u._id)}
                                            className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${selectedUsers.includes(u._id)
                                                ? 'bg-blue-500/20 border border-blue-500'
                                                : 'bg-slate-700/50 hover:bg-slate-700'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-slate-600 rounded-full flex items-center justify-center">
                                                    <User size={18} className="text-slate-400" />
                                                </div>
                                                <div>
                                                    <p className="text-white font-medium">{u.name}</p>
                                                    <p className="text-slate-400 text-sm">{u.email}</p>
                                                </div>
                                            </div>
                                            {selectedUsers.includes(u._id) && (
                                                <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                        <div className="px-6 pb-6 space-y-3 sticky bottom-0 bg-slate-800 pt-4">
                            <button
                                onClick={handleAddParticipants}
                                disabled={selectedUsers.length === 0}
                                className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2"
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
                                className="w-full bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg font-medium"
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