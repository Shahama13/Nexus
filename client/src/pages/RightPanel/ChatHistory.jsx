import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Paperclip, Smile, Send, Image, Video, Music, FileText, X, Upload, Sparkles, MoreVertical , Users } from 'lucide-react'
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
import { sendAttachments } from '../../services/attachments'
import { askAi } from '../../services/ai.js'
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { v4 as uuidv4 } from 'uuid';
import '../../styles/ChatHistory.scss'

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

  useEffect(() => {
    if (!activeChat) return
    setOnline(false);
    setLastSeen(null);
    setMessages([])
    setCurrentPage(1)
    setTotalPages(1)
    setTypingUsers(false)
    setAttachments([])
    setCurrentReply(null)
    initialLoadRef.current = true
    fetchMessages(1, true)
    socket.emit(JOIN_CHAT_EVENT, activeChat._id)
  }, [activeChat._id, user._id])

  useEffect(() => {
    if (typingUsers) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "end",
        });
      });
    }
  }, [typingUsers]);


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
          reactions: msg.reactions || {},
          attachments: msg.attachments || []
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
    const tempId = uuidv4();

    const isAskingNexus = nexusMode
    const nexusQuery = nexusMode ? msg : null
    const displayMsg = isAskingNexus ? `@nexus ${msg}` : msg

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

        const response = await sendAttachments(formData);
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
            tempId: tempId,
            chatId: activeChat._id,
            sender: { name: user.name, _id: user._id },
            text: displayMsg,
            isOwn: true,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase(),
            timestamp: Date.now(),
            date: new Date().toDateString(),
            createdAt: new Date().toISOString(),
            pending: true,
            reactions: {},
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
        const aiTempId = uuidv4();

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
        if (message.tempId) {
          const tempIndex = prev.findIndex(m => m.id === message.tempId);
          if (tempIndex !== -1) {
            const updatedMessages = [...prev];
            updatedMessages[tempIndex] = {
              ...message,
              id: message.id,
              tempId: undefined,
              isOwn: message.sender._id === user._id,
              pending: false,
              reactions: message.reactions || {}
            };
            return updatedMessages;
          }
        }

        const exists = prev.find(m => m.id === message.id);
        if (exists) return prev;

        return [
          ...prev,
          {
            ...message,
            isOwn: message.sender._id === user._id,
            pending: false,
            reactions: message.reactions || {}
          }
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
      prev.map(m => {
        const matches =
          m.id.toString() === data.messageId.toString() ||
          (m.tempId && m.tempId.toString() === data.messageId.toString());

        if (matches) {
          return {
            ...m,
            reactions: data.reactions,
            id: data.messageId,
            tempId: undefined
          };
        }
        return m;
      })
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
      setMessage(val.slice(6).trimStart())
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
    }, 1000)
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

  useEffect(() => {
    return () => {
      if (typingRef.current) {
        socket.emit(TYPING, {
          chatId: activeChat._id,
          typing: false
        })
      }
      clearTimeout(timeoutId.current)
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
    <div className="chat-history">
      {/* Header */}
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-left">
          <div className="chat-avatar">
            {activeChat.isGroupChat ?
              <Users size={18} />
              : activeChat?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="chat-header-info">
            <h2>{activeChat?.name}</h2>
            {!activeChat?.isGroupChat && (
              online ? (
                <p className="online-status">Online</p>
              ) : lastSeen ? (
                <p className="last-seen">Last seen {moment(lastSeen).fromNow()}</p>
              ) : (
                <p className="last-seen">Offline</p>
              )
            )}
            {activeChat?.isGroupChat && (
              <p className="group-info">Group • {activeChat?.participants?.length || 0} members</p>
            )}
          </div>
        </div>

        {activeChat?.isGroupChat && (
          <div className="chat-header-right">
            <button
              type="button"
              className="group-details-btn"
              onClick={() => {
                useUIStore.getState().setIsDetailsModalOpen(true);
                useUIStore.getState().setChatDetailId(activeChat._id);
                
              }}
              aria-label="Open chat details"
            >
              <MoreVertical  size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="chat-messages"
      >
        {loading && currentPage > 1 && (
          <div className="chat-loading">
            <div className="chat-spinner"></div>
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

          const startsWithNexus = item.text?.toLowerCase().startsWith("@nexus") || false
          const actualMessage = startsWithNexus ? item.text.slice(7) : item.text

          // Generate a unique key using id + index + timestamp to ensure uniqueness
          const messageKey = item.id
            ? `${item.id}-${idx}`
            : `temp-${item.tempId || idx}-${Date.now()}`

          return (
            <div
              key={messageKey}
              onMouseEnter={() => setShowMenu(item.id)}
              onMouseLeave={() => setShowMenu(null)}
              className={`message-row ${item.isOwn ? 'own' : 'other'}`}
            >
              {!item.isOwn && activeChat?.isGroupChat && (
                <div className="message-avatar">
                  {item?.sender?.name?.charAt(0).toUpperCase()}
                </div>
              )}

              <div className={`message-col ${item.isOwn ? 'own' : 'other'}`}>
                {((!item.isOwn && activeChat?.isGroupChat) || isNexusAi) && (
                  <span className="sender-name">
                    {isNexusAi && "🤖"} {item.sender?.name}
                  </span>
                )}

                <div className="message-wrapper">
                  {isMenuOpen && (
                    <div className={`message-actions ${item.isOwn ? 'own' : 'other'}`}>
                      <button onClick={() => handleReply(item)} className="action-btn">
                        <Reply size={16} />
                      </button>
                      <button
                        onClick={() => setShowEmojiPicker(prev => (prev === item.id ? null : item.id))}
                        className="action-btn"
                      >
                        <Smile size={16} />
                      </button>
                    </div>
                  )}

                  {isQuickOpen && (
                    <div
                      className={`emoji-picker ${item.isOwn ? 'own' : 'other'}`}
                      onMouseLeave={() => setShowEmojiPicker(null)}
                    >
                      {["👍", "❤️", "😂", "😮", "😢"].map(e => (
                        <button
                          key={e}
                          onClick={() => {
                            handleReaction("add", item.id, e);
                            setShowEmojiPicker(null);
                          }}
                          className="emoji-option"
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  )}

                  <div
                    className={`message-bubble ${item.isOwn ? 'own' : 'other'} ${!item.text && item.attachments && item.attachments.length > 0 ? 'media-only' : ''}`}
                  >
                    {item.threadId && (
                      <div className={`reply-preview ${item.isOwn ? 'own' : 'other'}`}>
                        <div className="reply-content">
                          <p className={`reply-sender ${item.isOwn ? 'own' : 'other'}`}>
                            {user._id === item.threadId.sender?._id ? "You" : item.threadId.sender?.name}
                          </p>
                          <p className={`reply-text ${item.isOwn ? 'own' : 'other'}`}>{item.threadId.content}</p>
                          {item.threadId?.attachments?.length > 0 && (
                            <div className="reply-attachments">
                              {item.threadId?.attachments?.map((att, index) => (
                                <FilePreview
                                  key={`reply-att-${index}-${att.url || att.fileName}`}
                                  index={index}
                                  att={att}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {item.attachments && item.attachments.length > 0 && (
                      <div className={`message-attachments ${!item.text ? 'no-text' : ''}`}>
                        <MediaMessage attachments={item.attachments} isOwn={item.isOwn} />
                      </div>
                    )}

                    {item.text && (
                      <div className="message-text">
                        {isNexusAi ? (
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              ul: ({ children }) => (
                                <ul className="markdown-ul">{children}</ul>
                              ),
                              li: ({ children }) => (
                                <li className="markdown-li">{children}</li>
                              ),
                              strong: ({ children }) => (
                                <strong className="markdown-strong">{children}</strong>
                              ),
                              p: ({ children }) => (
                                <p className="markdown-p">{children}</p>
                              ),
                              br: () => <br className="markdown-br" />,
                              h1: ({ children }) => (
                                <h1 className="markdown-h1">{children}</h1>
                              ),
                              h2: ({ children }) => (
                                <h2 className="markdown-h2">{children}</h2>
                              ),
                            }}
                          >
                            {actualMessage}
                          </ReactMarkdown>
                        ) : (
                          <p className="message-content">
                            <span className={`nexus-tag ${!item.isOwn ? 'other' : 'own'}`}>
                              {startsWithNexus && "@Nexus "}
                            </span>
                            {actualMessage}
                          </p>
                        )}
                        <span className={`message-time ${item.isOwn ? 'own' : 'other'}`}>
                          {time}
                        </span>
                      </div>
                    )}

                    {!item.text && item.attachments && item.attachments.length > 0 && (
                      <span className={`message-time ${item.isOwn ? 'own' : 'other'}`}>
                        {time}
                      </span>
                    )}

                    {item.reactions && Object.keys(item.reactions).length > 0 && (
                      <div
                        onClick={() => handleReaction("remove", item.id)}
                        className={`reaction-badge ${item.isOwn ? 'own' : 'other'}`}
                      >
                        {Object.entries(item.reactions).map(([emoji, users]) => (
                          <div key={emoji} className="reaction-item">
                            {emoji}
                            <span className="reaction-count">
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
          <div className="typing-indicator">
            <div className="typing-bubble">
              <div className="typing-dots">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className={`chat-input-container ${currentReply ? 'has-reply' : ''}`}>
        {currentReply && (
          <div className="reply-input-preview">
            <div className="reply-preview-content">
              <p className="reply-label">Replying to {user._id === currentReply.sender?._id ? "yourself" : currentReply.sender?.name}</p>
              <p className="reply-preview-text">{currentReply.text}</p>
              {currentReply?.attachments?.length > 0 && (
                <div className="reply-preview-attachments">
                  {currentReply.attachments?.map((att, index) => (
                    <FilePreview
                      key={`reply-input-att-${index}-${att.url || att.fileName}`}
                      index={index}
                      att={att}
                    />
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => setCurrentReply(null)} className="reply-close-btn">
              <XIcon size={16} />
            </button>
          </div>
        )}

        {attachments.length > 0 && (
          <div className="attachments-preview">
            <div className="attachments-list">
              {attachments.map((att, index) => (
                <FileAttachment
                  key={`attachment-${index}-${att.name || att.type}`}
                  att={att}
                  index={index}
                  handleRemoveAttachment={handleRemoveAttachment}
                />
              ))}
            </div>
          </div>
        )}

        <div className="input-row">
          {showAttachmentModal && (
            <AttachmentModal setAttachments={setAttachments} setShowAttachmentModal={setShowAttachmentModal} />
          )}

          <button
            onClick={() => setShowAttachmentModal(!showAttachmentModal)}
            className="attachment-btn"
            disabled={uploading}
          >
            <Paperclip size={20} />
          </button>

          <div className="input-wrapper">
            {nexusMode && (
              <div className="nexus-mode-indicator">
                <Sparkles size={14} />
                <span>@nexus</span>
                <button
                  onClick={() => { setNexusMode(false); setMessage('') }}
                  className="nexus-mode-close"
                >
                  <X size={12} />
                </button>
              </div>
            )}
            <input
              type="text"
              placeholder={nexusMode ? "Ask Nexus AI..." : "Type a message... (use @Nexus to ask AI)"}
              value={message}
              onChange={handleTyping}
              onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
              disabled={uploading}
              className="message-input"
              style={{
                paddingLeft: nexusMode ? '118px' : '16px'
              }}
            />
          </div>

          <button
            onClick={handleSendMessage}
            disabled={(!message?.trim() && attachments.length === 0) || uploading}
            className={`send-btn }`}
          >
            {uploading ? (
              <div className="send-loader"></div>
            ) : (
              <Send size={19} />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ChatHistory