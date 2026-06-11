import React from 'react'
import { useUIStore } from '../store/uiStore'
import EmptyChatState from '../pages/RightPanel/EmptyState'
import ChatHistory from '../pages/RightPanel/ChatHistory'
import NexusAI from '../pages/RightPanel/NexusAI'

const RightPanel = () => {
    const { rightView } = useUIStore()
    switch (rightView) {
        case "CHAT_HISTORY":
            return <ChatHistory />
        case "Nexus_AI":
            return <NexusAI />
        case "GROUP_PROFILE":
            return <GroupProfile />

        default:
            return <EmptyChatState />
    }
}

export default RightPanel