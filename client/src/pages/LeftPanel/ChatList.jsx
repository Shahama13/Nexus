import React, { useEffect, useState } from 'react'
import { Search, SlidersHorizontal, Plus, Sparkles, Users, Archive } from 'lucide-react'
import { useUIStore } from '../../store/uiStore'
import { getMyChats } from '../../services/chat'
import { useSocket } from '../../socket'
import { useRealTime } from '../../store/realTime'
import { useAuth } from '../../store/auth'
import { useSocketEvents } from '../../hooks/useSocketEvents'
import { LEAVE_CHAT_EVENT, NEW_CHAT_EVENT, NEW_MESSAGE_ALERT } from '../../constants/events'
import '../../styles/ChatList.scss'

// Cycled palette for group / DM avatar backgrounds (purely cosmetic)
const AVATAR_COLORS = ['#6C63FF', '#A78BFA', '#F472B6', '#FB923C', '#38BDF8', '#34D399', '#FACC15']

function getAvatarColor(id = '') {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function formatTime(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return ''

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.round((startOfToday - startOfDate) / 86400000)

  if (diffDays === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 1) return 'Yesterday'
  if (diffDays > 1 && diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' })
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'groups', label: 'Groups' },
  { id: 'dms', label: 'DMs' },
]

export default function ChatList() {
  const { activeChat, setActiveChat, setRightView, setIsAddChatModalOpen, setIsDetailsModalOpen, setChatDetailId, chatDetailId } = useUIStore()
  const { unreadByChat, removeUnread, addUnread, addLastMessage, lastMessage, setAllChats } = useRealTime()
  const { user } = useAuth()
  const socket = useSocket()

  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [chats, setChats] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMyChats()
      .then(res => {
        const mappedChats = res.data.chats.map((chat) => {
          const otherUser = chat?.participants?.find(c => c._id !== user._id);
          return {
            ...chat,
            title: chat.isGroupChat ? chat.name : otherUser?.name || "Chat",
            isChatBot: chat.name === "Nexus AI"
          }
        })

        const aiChat = mappedChats.filter(c => c.isChatBot === true)
        const regularChats = mappedChats.filter(c => !c.isChatBot)
        const sortedByAiChatFirst = [...aiChat, ...regularChats]

        setChats(sortedByAiChatFirst)
        setAllChats(sortedByAiChatFirst)
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  const filteredChats = chats
    .filter((chat) => chat?.title?.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter((chat) => {
      if (activeTab === 'unread') return unreadByChat[chat._id] > 0
      if (activeTab === 'groups') return chat.isGroupChat
      if (activeTab === 'dms') return !chat.isGroupChat
      return true
    })

  const newChatEventHandler = (data) => {
    const otherUser = data?.participants?.find(c => c._id !== user._id);
    const formattedChat = {
      ...data,
      title: data.isGroupChat ? data.name : otherUser?.name || "Chat",
      isChatBot: data.name === "Nexus AI"
    }

    setChats(prev => {
      const newChats = [formattedChat, ...prev]
      const aiChats = newChats.filter(c => c.isChatBot === true)
      const regularChats = newChats.filter(c => !c.isChatBot)
      return [...aiChats, ...regularChats]
    })
  }

  const newMessageAlertHandler = ({ chatId, sender, content }) => {
    if (activeChat?._id.toString() !== chatId.toString() && sender._id.toString() !== user._id.toString()) {
      addUnread(chatId)
    }
    addLastMessage({ chatId, content, sender })
  }

  const leaveChatEventhandler = (data) => {
    if (!data.participants.includes(user._id)) {
      if (chatDetailId?.toString() === data._id.toString()) {
        setChatDetailId("")
        setIsDetailsModalOpen(false)
      }
      setChats(prev => prev.filter((c) => c._id.toString() !== data._id.toString()))
      if (activeChat?._id.toString() === data?._id.toString()) {
        setActiveChat(null)
        setRightView(null)
      }
    }
  }

  useSocketEvents(socket, {
    [NEW_CHAT_EVENT]: newChatEventHandler,
    [NEW_MESSAGE_ALERT]: newMessageAlertHandler,
    [LEAVE_CHAT_EVENT]: leaveChatEventhandler
  })

  useEffect(() => {
    if (!socket) return

    socket.on("connect", () => console.log("socket connected"))
    socket.on("connect_error", err => console.error("socket error", err.message))

    return () => {
      socket.off("connect")
      socket.off("connect_error")
    }
  }, [socket])

  const handleNewChat = () => setIsAddChatModalOpen(true)

  return (
    <div className="chat-list-container">

      {/* Search */}
      <div className="search-wrapper">
        <Search size={16} className="search-icon" />
        <input
          type="text"
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="search-input"
        />
        <button type="button" className="filter-icon-btn" aria-label="Filter options">
          <SlidersHorizontal size={15} />
        </button>
      </div>

      {/* Tabs */}
      <div className="chat-tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`chat-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Chat List */}
      <div className="chat-list-body">
        {loading && (
          <p className="empty-state">Loading chats…</p>
        )}

        {!loading && filteredChats.length === 0 && (
          <p className="empty-state">No chats found</p>
        )}

        <div className="chat-items">
          {filteredChats.map(chat => {
            const avatarChar = chat.title?.charAt(0)?.toUpperCase() || "C"
            const isBot = chat.name === "Nexus AI"
            const lastMsg = lastMessage[chat._id] || chat.lastMessage
            const timeLabel = formatTime(lastMsg?.createdAt || chat.updatedAt)
            const unreadCount = unreadByChat[chat._id]

            return (
              <div
                key={chat._id}
                onClick={(e) => {
                  if (e.target.closest('.ellipsis-button')) return
                
                  setActiveChat({ ...chat, name: chat.title })
                  if (isBot) return setRightView("Nexus_AI")
                  removeUnread(chat._id)
                  setRightView('CHAT_HISTORY')
                }}
                className={`chat-item ${activeChat?._id === chat._id ? 'active' : ''}`}
              >
                <div
                  className={`avatar ${isBot ? 'bot-avatar' : ''}`}
                  style={!isBot ? { background: getAvatarColor(chat._id) } : undefined}
                >
                  {isBot ? <Sparkles size={17} /> : chat.isGroupChat ? <Users size={17} /> : avatarChar}
                </div>


                <div className="chat-info">
                  <h3 className="chat-title">{chat.title}</h3>
                  {lastMsg ? (
                    <p className="chat-preview">
                      {lastMsg.sender?._id === user._id ? "You:" : lastMsg.sender?.name + ":"}{" "}
                      {lastMsg.attachments?.length > 0 ? (
                        <span className="attachment-label">
                          {lastMsg.attachments[0].attachmentType}
                        </span>
                      ) : (
                        lastMsg.content
                      )}
                    </p>
                  ) : (
                    <p className="chat-preview">AI assistant</p>
                  )}
                </div>

                <div className="chat-meta">
                  {timeLabel && <span className="chat-time">{timeLabel}</span>}
                  {unreadCount > 0 && (
                    <span className="unread-badge">{unreadCount}</span>
                  )}
                </div>

                {/* {chat.isGroupChat && (
                  <button
                    type="button"
                    className="ellipsis-button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsDetailsModalOpen(true)
                      setChatDetailId(chat._id)
                    }}
                    aria-label="Open chat details"
                  >
                    <Users size={13} />
                  </button>
                )} */}
              </div>
            )
          })}
        </div>


      </div>

      {/* Floating New Chat button (functionality preserved from original wide button) */}
      <button className="new-chat-fab" onClick={handleNewChat} aria-label="New chat">
        <Plus size={20} />
      </button>

    </div>
  )
}