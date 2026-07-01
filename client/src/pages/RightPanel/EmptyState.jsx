import React from 'react'
import { MessageSquare, Sparkles, Users, Plus } from 'lucide-react'
import { useUIStore } from '../../store/uiStore'
import '../../styles/EmptyChatState.scss'

export default function EmptyChatState() {
  const { setIsAddChatModalOpen } = useUIStore()

  return (
    <div className="empty-chat-state">
      <div className="empty-chat-illustration">
        <div className="bubble bubble-back">
          <Users size={22} />
        </div>
        <div className="bubble bubble-front">
          <MessageSquare size={28} />
        </div>
        <div className="sparkle sparkle-one">
          <Sparkles size={14} />
        </div>
        <div className="sparkle sparkle-two">
          <Sparkles size={10} />
        </div>
      </div>

      <h2 className="empty-chat-title">Select a chat to start messaging</h2>
      <p className="empty-chat-subtitle">
        Choose a conversation from the list, or start something new with a teammate or Nexus AI.
      </p>

      <button className="empty-chat-cta" onClick={() => setIsAddChatModalOpen(true)}>
        <Plus size={16} />
        New Chat
      </button>
    </div>
  )
}