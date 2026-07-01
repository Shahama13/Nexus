import React from 'react'
import { MessageSquare, Settings, AtSign, Star, File, MoreHorizontal, Edit, Sparkles, ChevronDown, HelpCircle, ArrowRight } from 'lucide-react'
import { useUIStore } from '../store/uiStore'
import { useRealTime } from '../store/realTime'
import { useAuth } from '../store/auth'
import '../styles/Sidebar.scss'

export default function Sidebar() {
  const { leftView, setLeftView, setIsAddChatModalOpen, setRightView, setActiveChat } = useUIStore()
  const { unreadByChat, allChats } = useRealTime()
  const { user } = useAuth()


  const navItems = [
    { id: 'CHAT_LIST', label: 'Chats', icon: <MessageSquare size={18} /> },
    // { id: 'MENTIONS',  label: 'Mentions', icon: <AtSign size={18} /> },
    // { id: 'STARRED',   label: 'Starred',  icon: <Star size={18} /> },
    // { id: 'FILES',     label: 'Files',    icon: <File size={18} /> },
    // { id: 'MORE',      label: 'More',     icon: <MoreHorizontal size={18} /> },
  ]
  const handleNewChat = () => setIsAddChatModalOpen(true)
  return (
    <div className="sidebar-container">

      {/* Brand */}
      <div className="sidebar-brand">
        <Sparkles size={22} className="brand-icon" />
        <span className="brand-name">Nexus</span>
      </div>

      {/* New Chat */}
      <button
        className="new-chat-btn"
        onClick={handleNewChat}
      >
        <Edit size={15} />
        New Chat
      </button>

      {/* Nav */}
      <nav className="sidebar-nav">
        {navItems.map(item => (
          <button
            key={item.id}
            className={`sidebar-nav-item ${leftView === item.id ? 'active' : ''}`}
            onClick={() => setLeftView(item.id)}
            title={item.label}
          >
            {item.icon}
            {item.label}
            {Object.entries(unreadByChat).length > 0 &&
              <div className='unread-badge'>
                {Object.entries(unreadByChat).length}
              </div>
            }
          </button>
        ))}
      </nav>

      <div className="sidebar-spacer" />

      {/* Nexus AI Card */}
      <div className="nexus-ai-card">
        <div className="nexus-ai-header">
          <Sparkles size={15} />
          Try Nexus AI
        </div>
        <p className="nexus-ai-desc">
          Get answers, summarize, brainstorm and more.
        </p>
        <button
          className="ask-nexus-btn"
          onClick={() => {
            setActiveChat({ ...allChats[0], name: "Nexus AI" })
            setRightView("Nexus_AI")
          }}
        >
          Ask Nexus <ArrowRight size={13} />
        </button>
      </div>

      {/* Profile Row */}
      <div
        className="sidebar-profile"
        onClick={() => setLeftView('MY_PROFILE')}
      >
        <div className="profile-avatar">
          <div className="avatar-circle">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="online-dot" />
        </div>
        <div className="profile-info">
          <p className="profile-name">{user?.name || 'User'}</p>
          <p className="profile-status">Online</p>
        </div>
        <ChevronDown size={14} className="profile-chevron" />
      </div>

      {/* Bottom Icons */}
      <div className="sidebar-bottom-icons">
        <button
          className={`icon-btn ${leftView === 'MY_PROFILE' ? 'active' : ''}`}
          onClick={() => setLeftView('MY_PROFILE')}
          title="Settings"
        >
          <Settings size={17} />
        </button>
        <button
          className="icon-btn"
          title="Help"
        >
          <HelpCircle size={17} />
        </button>
      </div>

    </div>
  )
}