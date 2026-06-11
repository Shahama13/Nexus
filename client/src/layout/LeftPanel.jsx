import React from 'react'
import { useUIStore } from '../store/uiStore'
import ChatList from '../pages/LeftPanel/ChatList'
import MyProfile from '../pages/LeftPanel/MyProfile'

const LeftPanel = () => {
    const { leftView } = useUIStore()
    switch (leftView) {
        case "CHAT_LIST":
            return <ChatList />
        case "MY_PROFILE":
            return <MyProfile />

        default:
            return <ChatList />
    }
}

export default LeftPanel