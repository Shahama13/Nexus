import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Paperclip, Smile, Send, Image, Video, Music, FileText, X, Upload } from 'lucide-react'
import { useUIStore } from '../../store/uiStore'
import { useSocket } from '../../socket'
import { JOIN_CHAT_EVENT, TOGGLE_REACTION_EVENT, NEW_MESSAGE_EVENT, TYPING, USER_ONLINE_EVENT, USER_OFFLINE_EVENT, CHECK_ONLINE_EVENT } from '../../constants/events'
import { useAuth } from '../../store/auth'
import { useSocketEvents } from '../../hooks/useSocketEvents'
import { getMessages } from '../../services/message'
import { flushSync } from 'react-dom'
import { Reply, X as XIcon } from 'lucide-react'
import moment from 'moment/moment'
import MediaMessage from '../../components/MediaMessage'
import FileAttachment from '../../components/FileAttachment'
import FilePreview from '../../components/FilePreview.jsx'
import AttachmentModal from '../../components/AttachmentModal'
import { uploadAttachments } from '../../services/attachments'
import { askAi } from '../../services/ai.js'
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
  const [showAttachmentModal, setShowAttachmentModal] = useState(false)
  const { activeChat } = useUIStore()
  const { user } = useAuth()
  const socket = useSocket()

  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [nexusMode, setNexusMode] = useState(false)
  const fileInputRef = useRef(null);




  const handleRemoveAttachment = (index) => {
    // Revoke object URL to prevent memory leaks
    if (attachments[index]?.preview) {
      URL.revokeObjectURL(attachments[index].preview);
    }
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const scrollPositionRef = useRef(0)
  const initialLoadRef = useRef(true)
  const typingRef = useRef(false)
  const timeoutId = useRef(null)

  // Fetch chat details & initial messages
  useEffect(() => {
    if (!activeChat) return
    setOnline(false);
    setLastSeen(null);
    setMessages([])
    setCurrentPage(1)
    setTotalPages(1)
    setTypingUsers(false)
    setAttachments([]) // Clear attachments when chat changes
    setCurrentReply(null) // Clear reply when chat changes
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
          reactions: msg.reactions,
          attachments: msg.attachments
        })).reverse()

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

  const handleSendMessage = async () => {
    if ((!message.trim() && attachments.length === 0) || uploading) return;
    const msg = message.trim()
    const tempId = crypto.randomUUID();

    const isAskingNexus = nexusMode
    const nexusQuery = nexusMode ? msg : null
    const displayMsg = isAskingNexus ? `@nexus ${msg}` : msg  // add this



    if (attachments.length > 0) {
      setUploading(true);
      try {
        const formData = new FormData();
        attachments.forEach(att => {
          formData.append('attachments', att.file);
        });
        formData.append('chatId', activeChat._id);
        formData.append('tempId', tempId);
        if (msg) formData.append('caption', msg);
        if (currentReply) formData.append('threadId', currentReply.id);

        const response = await uploadAttachments(formData);

        const newMessage = response.data.message;
        // flushSync(() => {
        //   setMessages(prev => [
        //     ...prev,
        //     {
        //       ...newMessage,
        //       isOwn: true,
        //       pending: false,
        //     }
        //   ]);
        // });

        setMessage('');
        setAttachments([]);
        setCurrentReply(null);
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

      } catch (error) {
        console.error('Error uploading attachments:', error);
        alert('Failed to send attachments');
      } finally {
        setUploading(false);
      }
    } else if (msg) {

      flushSync(() => {
        setMessages(prev => [
          ...prev,
          {
            id: tempId,
            chatId: activeChat._id,
            sender: { name: user.name, _id: user._id },
            text: displayMsg,  // <-- here
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
      setNexusMode(false)

      socket.emit(NEW_MESSAGE_EVENT, {
        chatId: activeChat._id,
        content: displayMsg,  
        tempId,
        threadId: currentReply ? currentReply : null
      })


      if (isAskingNexus) {
        console.log("You are asking nexus", nexusQuery)
        const response = await askAi(nexusQuery, activeChat?._id)

        const reader = response.body.getReader()
        const decoder = new TextDecoder()

        let result = ""
        const aiTempId = crypto.randomUUID();

        while (true) {
          const { done, value } = await reader.read()
          console.log({ done, value })

          if (done) break

          const chunk = decoder.decode(value)
          console.log("RAW CHUNK:", chunk)
          const lines = chunk.split("\n")

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = JSON.parse(line.slice(6))

              if (data.token) {


                result += data.token

                console.log(result)

                setMessages((prev) => {
                  const existingText = prev.find(p => p.id === aiTempId)

                  if (existingText) {
                    return prev.map((p) =>
                      p.id === aiTempId
                        ? {
                          ...p,
                          text: result,
                        }
                        : p
                    )
                  }

                  return [
                    ...prev,
                    {
                      id: aiTempId,
                      chatId: activeChat._id,
                      sender: { name: "Nexus AI" },
                      createdAt: new Date().toISOString(),
                      text: result,
                      isOwn: false,
                    }
                  ]
                })

              }

              if (data.done) {
                console.log("Stream finished")

                socket.emit(NEW_MESSAGE_EVENT, {
                  chatId: activeChat._id,
                  content: result,
                  tempId: aiTempId,
                  isAutomatedReply: true
                })
              }
            }
          }
        }

      }

      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

      console.log(currentReply, "currentReply")

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
  }

  const newMessageHandler = useCallback((message) => {
    if (message.chatId !== activeChat._id) return;

    flushSync(() => {
      setMessages(prev => {
        const byRealId = prev.find(m => m.id === message.id);
        if (byRealId) return prev;
        // Check if message already exists (by ID or tempId)
        const exists = prev.find(m =>
          m.id === message.id ||
          (message.tempId && m.id === message.tempId)
        );

        if (exists) return prev; // ← Don't add if already exists


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
    },
    [activeChat._id]
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
    const userFromActiveChat = activeChat.participants?.find((p) => p._id.toString() === userId.toString())
    if (!userFromActiveChat) return
    setOnline(online)
    if (lastSeen) setLastSeen(lastSeen)
  }, [activeChat]);

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
    const val = e.target.value

    if (nexusMode) {
      setMessage(val)
    } else if (val.toLowerCase().startsWith('@nexus')) {
      setNexusMode(true)
      setMessage(val.slice(6).trimStart()) // strip @nexus
    } else {
      setMessage(val)
    }

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
    }, 100)
  }

  const handleReply = (item) => {
    setCurrentReply(item)
    console.log(item, "current reply")
    setShowMenu(null)
  }

  const handleReaction = (action, messageId, reaction) => {
    socket.emit(TOGGLE_REACTION_EVENT, {
      action,
      chatId: activeChat._id,
      messageId,
      reaction,
    })
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

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
      // Cleanup attachment previews
      attachments.forEach(att => {
        if (att.preview) URL.revokeObjectURL(att.preview);
      });
    }
  }, [activeChat, socket])

  useEffect(() => {
    if (!activeChat || activeChat.isGroupChat) return;

    const other = activeChat.participants?.find(p => p._id.toString() !== user._id.toString());
    if (!other) return;

    socket.emit(CHECK_ONLINE_EVENT, { userId: other._id }, (res) => {
      setOnline(res.online);
      setLastSeen(res.lastSeen?.lastSeen)
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
            {online && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
            )}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{activeChat?.name}</h2>
            {!activeChat?.isGroupChat && (
              online ? (
                <p className="text-sm text-green-600 dark:text-green-400">Online</p>
              ) : lastSeen ? (
                <p className="text-sm text-gray-600 dark:text-gray-400">Last seen {moment(lastSeen).fromNow()}</p>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400">Offline</p>
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

        {messages.map((item, idx) => {
          const time = new Date(item.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          }).toUpperCase();

          const isMenuOpen = showMenu === item.id;
          const isQuickOpen = showEmojiPicker === item.id;
          const isNexusAi = item.sender.name === "Nexus AI"

          const startsWithNexus = item.text.toLowerCase().startsWith("@nexus")
          const actualMessage = startsWithNexus ? item.text.slice(7) : item.text

          return (
            <div
              key={item.id || idx}
              onMouseEnter={() => setShowMenu(item.id)}
              onMouseLeave={() => setShowMenu(null)}
              className={`flex ${item.isOwn ? 'justify-end' : 'justify-start'} items-start gap-2`}
            >
              {!item.isOwn && activeChat?.isGroupChat && (
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                  {item?.sender?.name?.charAt(0).toUpperCase()}
                </div>
              )}

              <div className={`flex flex-col ${item.isOwn ? 'items-end' : 'items-start'} max-w-3xl`}>
                {((!item.isOwn && activeChat?.isGroupChat) || isNexusAi) && (
                  <span className="text-xs text-blue-500 dark:text-blue-400 mb-1 px-1">
                    {isNexusAi && "🤖"} {item.sender?.name}
                  </span>
                )}

                <div className="relative">
                  {isMenuOpen && (
                    <div
                      className={`absolute ${item.isOwn ? '-left-20' : '-right-20'} flex items-center gap-1 bg-white/90 dark:bg-gray-900/90 backdrop-blur border border-gray-200 dark:border-gray-700 rounded-full px-1 py-1 shadow z-10`}
                    >
                      <button
                        onClick={() => handleReply(item)}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition"
                      >
                        <Reply size={16} className="text-gray-600 dark:text-gray-300" />
                      </button>
                      <button
                        onClick={() => setShowEmojiPicker(prev => (prev === item.id ? null : item.id))}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition"
                      >
                        <Smile size={16} className="text-gray-600 dark:text-gray-300" />
                      </button>
                    </div>
                  )}

                  {isQuickOpen && (
                    <div
                      className={`absolute -top-10 ${item.isOwn ? 'right-4' : 'left-4'} z-30`}
                      onMouseLeave={() => setShowEmojiPicker(null)}
                    >
                      <div className="flex items-center gap-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-2 py-1 rounded-full shadow">
                        {["👍", "❤️", "😂", "😮", "😢"].map(e => (
                          <button
                            key={e}
                            onClick={() => {
                              handleReaction("add", item.id, e);
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

                  <div
                    className={`py-2 pb-3 relative rounded-2xl shadow-sm ${
                      // Check if it's a media-only message (no text)
                      !item.text && item.attachments && item.attachments.length > 0
                        ? '' // No background for media-only messages
                        : item.isOwn
                          ? 'bg-blue-500 text-white rounded-tr-none'
                          : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-tl-none'
                      } ${item?.reactions && Object.keys(item?.reactions).length > 0 ? "mb-3" : ""
                      }`}
                  >
                    {item.threadId && (
                      <div className="mb-2 px-2">
                        <div className={`flex items-center bg-gray-100 dark:bg-gray-700/70 px-4 py-2 rounded-lg ${!item.isOwn ? 'border-l-blue-500' : 'border-l-blue-600'} border-l-4`}>
                          <div className="flex-1 min-w-0">
                            <p className="text-md text-blue-500 dark:text-blue-400 truncate font-semibold">
                              {user._id === item.threadId.sender?._id ? "You" : item.threadId.sender?.name}
                            </p>
                            <p className="text-sm text-gray-900 dark:text-white truncate">{item.threadId.content}</p>
                            {item.threadId?.attachments?.length > 0 && (
                              <div className="flex flex-wrap gap-2 py-2">
                                {item.threadId?.attachments?.map((att, index) => (
                                  <FilePreview index={index} att={att} />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {item.attachments && item.attachments.length > 0 && (
                      <div className={`${!item.text ? 'px-0' : 'px-4'}`}>
                        <MediaMessage attachments={item.attachments} isOwn={item.isOwn} />
                      </div>
                    )}

                    {item.text && (
                      <div className="px-4 flex flex-col">
                        {isNexusAi ? <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {actualMessage}
                        </ReactMarkdown> :
                          <p className="text-sm leading-relaxed break-words"><span className={`${!item.isOwn ? 'text-blue-500' : 'text-white'} font-bold`} >{startsWithNexus && "@Nexus "}</span>{actualMessage}</p>
                        }
                        <span className={`self-end text-xs mt-1 px-1 ${item.isOwn ? 'text-gray-100' : 'text-gray-400 dark:text-gray-300'}`}>
                          {time}
                        </span>
                      </div>
                    )}

                    {!item.text && item.attachments && item.attachments.length > 0 && (
                      <span className={`block text-right text-xs mt-1 px-4 ${item.isOwn ? 'text-gray-100' : 'text-gray-400 dark:text-gray-300'}`}>
                        {time}
                      </span>
                    )}

                    {item.reactions && Object.keys(item.reactions).length > 0 && (
                      <div
                        onClick={() => handleReaction("remove", item.id)}
                        className={`absolute ${item.isOwn ? 'right-2' : 'left-2'} -bottom-5 flex items-center text-sm bg-white/90 dark:bg-gray-900/90 backdrop-blur border border-gray-200 dark:border-gray-700 rounded-full p-1 shadow cursor-pointer hover:bg-gray-600`}
                      >
                        {Object.entries(item.reactions).map(([emoji, users]) => (
                          <div key={emoji} className="px-1">
                            {emoji}
                            <span className='text-xs'>
                              {Array.isArray(users) && users.length > 1 ? users.length : ""}
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
            <div className="px-4 py-2 rounded-2xl shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-tl-sm">
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
          <div className="mb-2 px-4">
            <div className="flex items-center gap-3 bg-gray-100 dark:bg-gray-700 px-4 py-2 rounded-lg border-l-blue-500 border-l-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-blue-500 dark:text-blue-400 truncate font-semibold">
                  Replying to {user._id === currentReply.sender?._id ? "yourself" : currentReply.sender?.name}
                </p>

                <p className="text-sm text-gray-900 dark:text-white truncate">{currentReply.text}</p>
                {currentReply?.attachments?.length > 0 && (
                  <div className="flex flex-wrap gap-2 py-2">
                    {currentReply.attachments?.map((att, index) => (
                      <FilePreview index={index} att={att} />
                    ))}
                  </div>
                )}
              </div>
              <button onClick={() => setCurrentReply(null)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors">
                <XIcon size={16} className="text-gray-500" />
              </button>
            </div>
          </div>
        )}

        {/* Attachment Preview Area */}
        {attachments.length > 0 && (
          <div className="px-4 mb-2">
            <div className="flex flex-wrap gap-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              {attachments.map((att, index) => (
                <FileAttachment att={att} index={index} handleRemoveAttachment={handleRemoveAttachment} key={index} />
              ))}
            </div>
          </div>
        )}

        <div className="flex relative items-center gap-3 px-4">
          {/* Attachment Modal */}
          {showAttachmentModal && (
            <AttachmentModal setAttachments={setAttachments} setShowAttachmentModal={setShowAttachmentModal} />
          )}

          <button
            onClick={() => setShowAttachmentModal(!showAttachmentModal)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors flex-shrink-0"
            disabled={uploading}
          >
            <Paperclip size={20} className="text-gray-600 dark:text-gray-400" />
          </button>

          <div className="flex-1 relative">
            {nexusMode && (
              <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full text-sm font-medium">
                <span>@nexus</span>
                <button
                  onClick={() => { setNexusMode(false); setMessage('') }}
                  className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5"
                >
                  <X size={12} />
                </button>
              </div>
            )}
            <input
              type="text"
              placeholder={nexusMode ? "Ask Nexus AI..." : "Type a message.. (use @Nexus to ask AI)"}
              value={message}
              onChange={handleTyping}
              onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
              disabled={uploading}
              className={`w-full px-4 py-3 outline-none bg-inherit rounded-full focus:outline-none focus:ring-0 
      ${nexusMode
                  ? 'pl-24 text-gray-900 dark:text-white'
                  : 'text-gray-900 dark:text-white'
                }`}
              style={{
                paddingLeft: nexusMode ? '100px' : '16px'
              }}
            />
          </div>

          <button
            onClick={handleSendMessage}
            disabled={(!message?.trim() && attachments.length === 0) || uploading}
            className="p-3 bg-blue-500 hover:bg-blue-600 rounded-full transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
            ) : (
              <Send size={20} className="text-white" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ChatHistory