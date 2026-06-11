import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Paperclip, Smile, Send } from 'lucide-react'
import { useUIStore } from '../../store/uiStore'
import { useSocket } from '../../socket'
import { JOIN_CHAT_EVENT, TOGGLE_REACTION_EVENT, NEW_MESSAGE_EVENT, TYPING, USER_ONLINE_EVENT, USER_OFFLINE_EVENT, CHECK_ONLINE_EVENT } from '../../constants/events'
import { useAuth } from '../../store/auth'
import { useSocketEvents } from '../../hooks/useSocketEvents'
import { getMessages, sendMessage } from '../../services/message'
import { flushSync } from 'react-dom'
import { Reply, X } from 'lucide-react'
import moment from 'moment/moment'

const ChatHistory = () => {
  const [message, setMessage] = useState('')
  const [showMenu, setShowMenu] = useState(null)

  const [messages, setMessages] = useState([])
  const [typingUsers, setTypingUsers] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [currentReply, setCurrentReply] = useState(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(null);
  const [online, setOnline] = useState(false)
  const [lastSeen, setLastSeen] = useState(null)
  const { activeChat } = useUIStore()
  const { user } = useAuth()
  const socket = useSocket()

  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const scrollPositionRef = useRef(0)
  const initialLoadRef = useRef(true)
  const typingRef = useRef(false)
  const timeoutId = useRef(null)

  // Fetch chat details & initial messages
  useEffect(() => {
    if (!activeChat) return
    // Reset state when chat changes
    setOnline(false);
    setLastSeen(null);
    setMessages([])
    setCurrentPage(1)
    setTotalPages(1)
    setTypingUsers(false)
    initialLoadRef.current = true
    fetchMessages(1, true)
    socket.emit(JOIN_CHAT_EVENT, activeChat._id)
  }, [activeChat._id, user._id])

  const fetchMessages = async (page, initial = false) => {
    if (loading || page > totalPages) return

    setLoading(true)
    try {
      const res = await getMessages(activeChat._id, page)

      const newMessages = res.data.messages
        .map(msg => ({
          id: msg._id,
          sender: msg.sender,
          text: msg.content,
          isOwn: msg.sender._id === user._id,
          createdAt: msg.createdAt,
          timestamp: new Date(msg.createdAt).getTime(),
          date: new Date(msg.createdAt).toDateString(),
          threadId: msg.threadId || null,
          reactions: msg.reactions
        })).reverse()
      console.log(newMessages)
      if (initial) {
        setMessages(newMessages)
        setTotalPages(res.data.totalPages || 1)

        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }, 100)
      } else {
        setMessages(prev => [...newMessages, ...prev])

        setTimeout(() => {
          if (messagesContainerRef.current) {
            const container = messagesContainerRef.current
            const newScrollHeight = container.scrollHeight
            container.scrollTop = newScrollHeight - scrollPositionRef.current
          }
        }, 0)
      }

      setCurrentPage(page)
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setLoading(false)
      initialLoadRef.current = false
    }
  }

  const handleSendMessage = () => {
    if (!message.trim()) return

    const msg = message.trim()
    const tempId = crypto.randomUUID();
    console.log('currentReply:', currentReply)

    //flushSync React ka function hai jo state update ko turant apply karne pe majboor karta hai.Normally React state updates ko batch karta hai. Matlab tum setState karte ho, React thoda wait karta hai, phir ek saath render karta hai. Ye performance ke liye hota hai.Lekin kabhi kabhi tumhe immediately DOM update chahiye hota hai. Tab flushSync use karte hain.

    flushSync(() => {


      setMessages(prev => [
        ...prev,
        {
          id: tempId,
          chatId: activeChat._id,
          sender: { name: user.name, _id: user._id },
          text: msg,
          isOwn: true,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase(),
          timestamp: Date.now(),
          date: new Date().toDateString(),
          createdAt: new Date().toISOString(),
          pending: true,
          threadId: currentReply ? {
            _id: currentReply.id,
            sender: currentReply.sender,
            content: currentReply.text
          } : null
        }
      ])

    })

    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })

    setMessage('')

    // sendMessage(activeChat._id, msg)

    socket.emit(NEW_MESSAGE_EVENT, {
      chatId: activeChat._id,
      content: msg,
      tempId,
      threadId: currentReply ? currentReply : null
    })

    setCurrentReply(null)

    if (typingRef.current) {
      typingRef.current = false
      socket.emit(TYPING, {
        chatId: activeChat._id,
        typing: false
      })
    }

    clearTimeout(timeoutId.current)
  }


  const newMessageHandler = useCallback((message) => {
    if (message.chatId !== activeChat._id) return;

    flushSync(() => {
      setMessages(prev => {
        const byRealId = prev.find(m => m.id === message.id);
        if (byRealId) return prev; // already have this message

        const byTempId = message.tempId
          ? prev.find(m => m.id === message.tempId)
          : null;

        if (byTempId) {
          return prev.map(m =>
            m.id === message.tempId
              ? {
                ...m,
                ...message,
                isOwn: message.sender._id === user._id,
                pending: false,
              }
              : m
          );
        }

        return [
          ...prev,
          {
            ...message,
            isOwn: message.sender._id === user._id,
          },
        ];
      });
    });

    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat._id, user._id]);

  const typingHandler = useCallback(
    ({ chatId, typing }) => {
      if (chatId !== activeChat._id) return
      flushSync(() => {
        setTypingUsers(typing)
      })
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })

    },
    [activeChat._id, user._id]
  )

  const reactionEventHandler = useCallback((data) => {
    if (data.chatId !== activeChat._id) return;

    setMessages(prev =>
      prev.map(m =>
        m.id.toString() === data.messageId.toString()
          ? { ...m, reactions: data.reactions }
          : m
      )
    );

  }, [activeChat._id]);

  const handleUserOnline = useCallback(({ userId, online, lastSeen }) => {
    if (activeChat && activeChat.isGroupChat) return
    const userFromActiveChat = activeChat.participants.find((p) => p._id.toString() === userId.toString())
    if (!userFromActiveChat) return
    setOnline(online)
    if (lastSeen) setLastSeen(lastSeen)
  }, [activeChat._id]);

  useSocketEvents(socket, {
    [NEW_MESSAGE_EVENT]: newMessageHandler,
    [TYPING]: typingHandler,
    [TOGGLE_REACTION_EVENT]: reactionEventHandler,
    [USER_ONLINE_EVENT]: handleUserOnline,
    [USER_OFFLINE_EVENT]: handleUserOnline
  })

  const handleScroll = useCallback((e) => {
    const container = e.target

    if (container.scrollTop === 0 && currentPage < totalPages && !loading) {
      const currentScrollHeight = container.scrollHeight
      scrollPositionRef.current = currentScrollHeight
      fetchMessages(currentPage + 1)
    }
  }, [currentPage, totalPages, loading])

  const handleTyping = (e) => {
    const newValue = e.target.value
    setMessage(newValue)
    if (!typingRef.current) {
      typingRef.current = true
      socket.emit(TYPING, {
        chatId: activeChat._id,
        typing: true
      })
    }

    clearTimeout(timeoutId.current)

    timeoutId.current = setTimeout(() => {
      typingRef.current = false
      socket.emit(TYPING, {
        chatId: activeChat._id,
        typing: false
      })
    }, 2000)

  }

  const handleReply = (item) => {
    setCurrentReply(item)
  }

  const handleReaction = (action, messageId, reaction) => {
    // Implement emoji picker logic here

    socket.emit(TOGGLE_REACTION_EVENT, {
      action,
      chatId: activeChat._id,
      messageId,
      reaction,
    })
  }


  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingRef.current) {
        socket.emit(TYPING, {
          chatId: activeChat._id,
          typing: false
        })
      }
      clearTimeout(timeoutId.current)
    }
  }, [activeChat, socket])


  useEffect(() => {
    if (!activeChat || activeChat.isGroupChat) return;

    const other = activeChat.participants.find(p => p._id.toString() !== user._id.toString());
    if (!other) return;

    socket.emit(CHECK_ONLINE_EVENT, { userId: other._id }, (res) => {
      setOnline(res.online);
      setLastSeen(res.lastSeen.lastSeen)
    });
  }, [activeChat?._id, socket, user._id]);


  return (
    <div
      style={{
        backgroundImage: "url('/back.png')",
        backgroundSize: "cover",
        backgroundPosition: "center"
      }}
      className="flex-1 flex flex-col h-screen bg-cover bg-center"
    >
      {/* Header */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3">
        <div className="flex items-center gap-3 cursor-pointer">
          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-lg font-semibold">
              {activeChat?.name?.charAt(0).toUpperCase()}
            </div>
            {
              online &&
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
            }
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{activeChat.name}</h2>

            {!activeChat?.isGroupChat && (
              online ? (
                <p className="text-sm text-green-600 dark:text-green-400">
                  Online
                </p>
              ) : lastSeen ? (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Last seen {moment(lastSeen).fromNow()}
                </p>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Offline
                </p>
              )
            )}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-6 py-4 space-y-4 pb-0"
        style={{ scrollbarWidth: 'thin' }}
      >
        {loading && currentPage > 1 && (
          <div className="flex justify-center py-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
        )}

        {messages.map(item => {
          const time = new Date(item.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          }).toUpperCase();

          const isMenuOpen = showMenu === item.id;
          const isQuickOpen = showEmojiPicker === item.id;

          return (
            <div
              key={item.id}
              onMouseEnter={() => setShowMenu(item.id)}
              onMouseLeave={() => {
                setShowMenu(null);
              }}
              className={`flex ${item.isOwn ? 'justify-end' : 'justify-start'} items-start gap-2`}
            >
              {!item.isOwn && activeChat.isGroupChat && (
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                  {item?.sender?.name?.charAt(0).toUpperCase()}
                </div>
              )}

              <div className={`flex flex-col ${item.isOwn ? 'items-end' : 'items-start'} max-w-md`}>
                {!item.isOwn && activeChat.isGroupChat && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 mb-1 px-1">
                    {item.sender.name}
                  </span>
                )}

                <div className="relative">
                  {/* hover action buttons */}
                  {isMenuOpen && (
                    <div
                      className={`absolute ${item.isOwn ? '-left-20' : '-right-20'} flex items-center gap-1 bg-white/90 dark:bg-gray-900/90 backdrop-blur border border-gray-200 dark:border-gray-700 rounded-full px-1 py-1 shadow`}
                    >
                      <button
                        onClick={() => handleReply(item)}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
                      >
                        <Reply size={16} className="text-gray-600 dark:text-gray-300" />
                      </button>

                      <button
                        onClick={() => {
                          setShowEmojiPicker(prev => (prev === item.id ? null : item.id));
                        }}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
                      >
                        <Smile size={16} className="text-gray-600 dark:text-gray-300" />
                      </button>
                    </div>
                  )}

                  {/* quick reactions bar */}
                  {isQuickOpen && (
                    <div
                      className={`absolute -top-10 ${item.isOwn ? 'right-4' : 'left-4'} z-30`}
                      onMouseLeave={() => {
                        setShowEmojiPicker(null);
                      }}
                    >
                      <div className="flex items-center gap-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-2 py-1 rounded-full shadow">
                        {["👍", "❤️", "😂", "😮", "😢"].map(e => (
                          <button
                            key={e}
                            onClick={() => {
                              handleReaction("add", item.id, e)
                              setShowEmojiPicker(null);
                            }}
                            className="text-lg hover:scale-125 transition"
                          >
                            {e}
                          </button>
                        ))}

                      </div>


                    </div>
                  )}

                  {/* message bubble */}
                  <div
                    className={`py-2 pb-3 relative rounded-2xl shadow-sm ${item.isOwn
                      ? 'bg-blue-500 text-white rounded-tr-none'
                      : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-tl-none'
                      }  ${item?.reactions && Object.keys(item?.reactions).length > 0 ? "mb-3" : ""}`}
                  >
                    {item.threadId && (
                      <div className="mb-2 px-2">
                        <div className={`flex items-center bg-gray-100 dark:bg-gray-700/70 px-4 py-2 rounded-lg ${!item.isOwn ? 'border-l-blue-500' : 'border-l-blue-600'} border-l-4`}>
                          <div className="flex-1 min-w-0">
                            <p className="text-md text-blue-500 dark:text-blue-400 truncate font-semibold">
                              {user._id === item.threadId.sender._id ? "You" : item.threadId.sender.name}
                            </p>
                            <p className="text-sm text-gray-900 dark:text-white truncate">{item.threadId.content}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="px-4 flex flex-col">
                      <p className="text-sm leading-relaxed break-words">{item.text}</p>
                      <span className={`self-end text-xs mt-1 px-1 ${item.isOwn ? 'text-gray-100' : 'text-gray-400 dark:text-gray-300'}`}>
                        {time}
                      </span>
                    </div>



                    {item.reactions && Object.keys(item.reactions).length > 0 && (
                      <div
                        onClick={() => handleReaction("remove", item.id)}
                        className={`absolute ${item.isOwn ? 'right-2' : 'left-2'} -bottom-5 flex items-center text-sm bg-white/90 dark:bg-gray-900/90 backdrop-blur border border-gray-200 dark:border-gray-700 rounded-full p-1 shadow cursor-pointer hover:bg-gray-600`}>

                        {Object.entries(item.reactions).map(([emoji, users]) => (
                          <div key={emoji} className="px-1 ">
                            {emoji}
                            <span className='text-xs'>
                              {Array.isArray(users) && users.length === 1 ? "" : users.length}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {typingUsers && (
          <div className="flex justify-start items-center gap-3">
            <div className="w-10 h-10 ">

            </div>
            <div className="px-4 py-2 rounded-2xl shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-bl-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className={`flex-shrink-5 border-none bg-white  m-4 dark:bg-gray-800 border-t border-gray-200 rounded-b-4xl dark:border-gray-700  py-2 ${currentReply ? "rounded-t-2xl" : "rounded-t-4xl"}`}>

        {currentReply && (
          <div className="mb-2 px-2">
            <div className="flex items-center gap-3 bg-gray-100 dark:bg-gray-700 px-4 py-2 rounded-lg border-l-blue-500 border-l-5">

              <div className="flex-1 min-w-0">
                <p className="text-md text-blue-500 dark:text-blue-400 truncate font-semibold">{user._id === currentReply.sender._id ? "You" : currentReply.sender.name}</p>
                <p className="text-sm text-gray-900 dark:text-white truncate">{currentReply.text}</p>
              </div>
              <button onClick={() => setCurrentReply(null)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors">
                <X size={18} className="text-gray-300 dark:text-slate-500 " />
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 px-6">
          <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors flex-shrink-0">
            <Paperclip size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Type a message..."
              value={message}
              onChange={handleTyping}
              onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
              className="w-full px-4 py-3 outline-none bg-inherit text-gray-900 dark:text-white rounded-full focus:outline-none focus:ring-0 "
            />

          </div>
          <button
            onClick={handleSendMessage}
            disabled={!message?.trim()}
            className="p-3 hover:bg-blue-500   rounded-full transition-colors flex-shrink-0"
          >
            <Send size={20} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default ChatHistory
