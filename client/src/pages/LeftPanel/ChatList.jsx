import React, { useCallback, useEffect, useState } from 'react'
import { Search, Plus, EllipsisVertical } from 'lucide-react'
import { useUIStore } from '../../store/uiStore'
import { getMyChats } from '../../services/chat'
import { useSocket } from '../../socket'
import { useRealTime } from '../../store/realTime'
import { useAuth } from '../../store/auth'
import { useSocketEvents } from '../../hooks/useSocketEvents'
import { LEAVE_CHAT_EVENT, NEW_CHAT_EVENT, NEW_MESSAGE_ALERT } from '../../constants/events'

export default function ChatList() {
  const { activeChat, setActiveChat, setRightView, setIsAddChatModalOpen, setIsDetailsModalOpen, setChatDetailId, chatDetailId } = useUIStore()
  const { unreadByChat, removeUnread, addUnread, addLastMessage, lastMessage } = useRealTime()
  const { user } = useAuth()
  const socket = useSocket()

  const [searchQuery, setSearchQuery] = useState('')
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
        }
        )


        const aiChat = mappedChats.filter(c => c.isChatBot === true)
        const regularChats = mappedChats.filter(c => !c.isChatBot)
        const sortedByAiChatFirst = [...aiChat, ...regularChats]


        setChats(sortedByAiChatFirst)

        console.log(sortedByAiChatFirst, "sortedByAiChatFirst")

        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  const filteredChats = chats.filter((chat) => {

    return chat?.title?.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const newChatEventHandler = (data) => {

    // Format the new chat
    const otherUser = data?.participants?.find(c => c._id !== user._id);
    const formattedChat = {
      ...data,
      title: data.isGroupChat ? data.name : otherUser?.name || "Chat",
      isChatBot: data.name === "Nexus AI"
    }

    // Add to list and re-sort
    setChats(prev => {
      const newChats = [formattedChat, ...prev]

      // Sort: AI chats first, then regular chats
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
    <div className="w-full h-screen bg-gray-50 dark:bg-slate-900 flex flex-col">
      <div className="p-4 flex items-center gap-3">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 " />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
          />
        </div>

        <button
          onClick={handleNewChat}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2.5 text-sm font-medium flex items-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
        >
          <Plus size={18} />
          Add chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {loading && (
          <p className="py-8 text-gray-500 dark:text-slate-400 text-sm text-center">
            Loading chats…
          </p>
        )}

        {!loading && filteredChats.length === 0 && (
          <p className="py-8 text-gray-500 dark:text-slate-400 text-sm text-center">
            No chats found
          </p>
        )}

        <div className="space-y-2">
          {filteredChats.map(chat => {

            const avatarChar = chat.title?.charAt(0)?.toUpperCase() || "C"
            const isBot = chat.name === "Nexus AI"

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
                className={`group relative flex items-center gap-3 p-3 pr-12 rounded-xl cursor-pointer transition-all ${activeChat?._id === chat._id
                  ? 'bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-slate-700'
                  : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-blue-500/10 dark:hover:bg-slate-750'
                  }`}
              >
                {/* Ellipsis is ALWAYS rendered, absolutely positioned, and only fades in on hover */}
                {chat.isGroupChat && (
                  <button
                    type="button"
                    className="ellipsis-button absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-400 dark:text-slate-500 opacity-0 group-hover:opacity-100 hover:text-blue-600 dark:hover:text-blue-300 transition"
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsDetailsModalOpen(true)
                      setChatDetailId(chat._id)
                    }}
                    aria-label="Open chat details"
                  >
                    <EllipsisVertical size={18} />
                  </button>
                )}

                <div className="h-11 w-11 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-2xl flex-shrink-0">
                  {!isBot ? avatarChar : "🤖"}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate text-sm">
                      {chat.title}
                    </h3>
                    {unreadByChat[chat._id] > 0 && (
                      <span className="ml-2 bg-blue-600 text-white text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0">
                        {unreadByChat[chat._id]}
                      </span>
                    )}
                  </div>

                  {unreadByChat[chat._id] > 0 ? (
                    <p className="text-xs text-gray-600 dark:text-slate-400 truncate">
                      {unreadByChat[chat._id]} new {unreadByChat[chat._id] === 1 ? 'message' : 'messages'}
                    </p>
                  ) : lastMessage[chat._id] ? (
                    <p className="text-xs text-gray-500 dark:text-slate-500 truncate">
                      {lastMessage[chat._id].sender._id.toString() === user._id.toString()
                        ? "You:"
                        : lastMessage[chat._id].sender.name + ":"}{" "}
                      {lastMessage[chat._id].content}

                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 dark:text-slate-500 truncate">
                      {chat.lastMessage?.sender?._id === user._id
                        ? "You:"
                        : chat.isGroupChat && chat.lastMessage?.sender?.name
                          ? chat.lastMessage.sender.name + ":"
                          : ""}{" "}

                      <span className='capitalize'>{chat.lastMessage?.attachments?.length > 0
                        ? `${chat.lastMessage.attachments[0].attachmentType}`
                        : ""}</span>   {chat.lastMessage?.content}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}