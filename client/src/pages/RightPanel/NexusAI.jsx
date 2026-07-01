import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
    Paperclip, Send, Image, FileText, ExternalLink,
    Search, Video, MoreVertical, Sparkles, Check, CheckCheck,
    Copy, MessageSquare, ThumbsUp, ThumbsDown, X
} from 'lucide-react'
import { useUIStore } from '../../store/uiStore'
import { JOIN_CHAT_EVENT, TOGGLE_REACTION_EVENT, NEW_MESSAGE_EVENT, TYPING, USER_ONLINE_EVENT, USER_OFFLINE_EVENT, CHECK_ONLINE_EVENT } from '../../constants/events'
import { useAuth } from '../../store/auth'
import { useSocketEvents } from '../../hooks/useSocketEvents'
import { getMessages, sendMessage } from '../../services/message'
import { flushSync } from 'react-dom'
import { Reply } from 'lucide-react'
import moment from 'moment/moment'
import { streamResponse } from '../../services/ai'
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import AttachmentModal from '../../components/AttachmentModal'
import { getAttachmentUrl } from '../../services/attachments'
import { v4 as uuidv4 } from 'uuid';
import '../../styles/NexusAI.scss'

const NexusAI = () => {
    const [message, setMessage] = useState('')
    const [isResponding, setIsResponding] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [showAttachmentModal, setShowAttachmentModal] = useState(false)
    const [attachments, setAttachments] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [isTyping, setIsTyping] = useState(false)

    const [messages, setMessages] = useState([])
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [loading, setLoading] = useState(false)

    const [lastSeen, setLastSeen] = useState(null)
    const { activeChat } = useUIStore()
    const { user } = useAuth()

    const messagesEndRef = useRef(null)
    const messagesContainerRef = useRef(null)
    const scrollPositionRef = useRef(0)
    const initialLoadRef = useRef(true)
    const modalRef = useRef(null);
    const welcomeTriggeredRef = useRef(false);

    useEffect(() => {
        if (isResponding) {
            requestAnimationFrame(() => {
                messagesEndRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "end",
                });
            });
        }
    }, [isResponding]);


    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                setShowAttachmentModal(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);


    const scrollToBottom = useCallback((behavior = 'smooth') => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({
                behavior,
                block: 'end'
            });
        }, 0);
    }, []);

    const handleRemoveAttachment = (index) => {
        // Revoke object URL to prevent memory leaks
        if (attachments[index]?.preview) {
            URL.revokeObjectURL(attachments[index].preview);
        }
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleAttachmentClick = (fileType) => {
        setShowAttachmentModal(false);
        // Create a new file input with specific accept attribute
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = false;

        switch (fileType) {
            case 'image':
                input.accept = 'image/*';
                break;

            case 'pdf':
                input.accept = '.pdf';
                break;

        }

        input.onchange = (e) => {
            const file = e.target.files[0];

            const newAttachment = {
                file: file,
                preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
                type: file.type,
                name: file.name,
                size: file.size
            };

            setAttachments(prev => [newAttachment]);

        };

        input.click();
    };



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

                const isUserWelcomed = localStorage.getItem(`user_welcomed_${user._id}`)

                if (newMessages.length === 0 && !isUserWelcomed && !welcomeTriggeredRef.current) {
                    setIsResponding(true);
                    welcomeTriggeredRef.current = true; // guards against double-fire, set this immediately instead
                    setIsTyping(true);
                    try {
                        const formData = new FormData();
                        formData.append("isNewConversation", true);
                        formData.append("userName", user.name);
                        formData.append("chatId", activeChat._id);

                        const response = await streamResponse(formData)

                        welcomeTriggeredRef.current = true;
                        const reader = response.body.getReader()
                        const decoder = new TextDecoder()

                        let result = ""
                        const aiTempId = uuidv4();

                        while (true) {
                            const { done, value } = await reader.read()

                            if (done) break

                            const chunk = decoder.decode(value)
                            const lines = chunk.split("\n")

                            for (const line of lines) {
                                if (line.startsWith("data: ")) {
                                    const data = JSON.parse(line.slice(6))

                                    if (data.token) {

                                        setIsTyping(false);
                                        result += data.token

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
                                                    text: result,
                                                    isOwn: false,
                                                }
                                            ]
                                        })

                                        requestAnimationFrame(() => {
                                            scrollToBottom('smooth');
                                        });
                                    }


                                    if (data.done) {
                                        console.log("Stream finished")
                                        setIsResponding(false)
                                        localStorage.setItem(`user_welcomed_${user._id}`, true)
                                    }
                                }
                            }
                        }


                    } catch (error) {
                        console.log(error, "error in streaming responsnes")
                        setIsResponding(false)
                        welcomeTriggeredRef.current = false
                    }
                    finally {
                        setIsTyping(false);
                    }

                }
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

    useEffect(() => {
        if (!activeChat) return
        setMessages([])
        setCurrentPage(1)
        setTotalPages(1)

        initialLoadRef.current = true
        fetchMessages(1, true)
    }, [activeChat._id, user._id])



    const handleSendMessage = async () => {
        if (!message.trim()) return

        setIsLoading(true)


        const msg = message.trim()
        const tempId = uuidv4();
        let attachment = []
        const hasPDF = attachments.some(att => att.type === 'application/pdf');
        const pdfFile = attachments.find(att => att.type === 'application/pdf');


        if (attachments.length > 0 && !hasPDF) {
            const formData = new FormData()
            formData.append('attachment', attachments[0].file);
            const { data } = await getAttachmentUrl(formData)
            attachment.push(data.attachment)
        }

        if (attachments.length > 0 && hasPDF) {
            const formData = new FormData()
            formData.append('attachment', attachments[0].file);
            const { data } = await getAttachmentUrl(formData)
            attachment.push(data.attachment)
        }


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
                    attachments: attachment

                }
            ])

        })

        setIsLoading(false)

        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })

        setIsResponding(true)
        setIsTyping(true)

        setMessage('')
        setAttachments([])


        try {

            // let response;
            const formData = new FormData();
            formData.append('message', msg);
            formData.append('chatId', activeChat._id);

            // If there's a PDF, send it as file
            if (pdfFile) {
                formData.append('pdfFile', pdfFile.file);
            }

            // If there's an image attachment URL, send it
            if (attachment.length > 0) {
                formData.append('attachment', JSON.stringify(attachment[0]));
            }

            const response = await streamResponse(formData)

            const reader = response.body.getReader()
            const decoder = new TextDecoder()

            let result = ""
            const aiTempId = uuidv4();

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                const chunk = decoder.decode(value)
                const lines = chunk.split("\n")

                for (const line of lines) {
                    if (line.startsWith("data: ")) {
                        const data = JSON.parse(line.slice(6))

                        if (data.token) {


                            result += data.token

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
                                        sender: { name: user.name, _id: user._id },
                                        text: result,
                                        isOwn: false,
                                        date: new Date().toDateString(),
                                        timestamp: Date.now(),
                                        createdAt: new Date().toISOString(),

                                    }
                                ]
                            })

                            setIsTyping(false)

                            requestAnimationFrame(() => {
                                scrollToBottom('smooth');
                            });
                        }


                        if (data.done) {
                            console.log("Stream finished")
                            setIsResponding(false)
                        }
                    }
                }
            }


        } catch (error) {
            console.log(error, "error in streaming responsnes")
            setIsResponding(false)

        } finally {
            setIsTyping(false)
        }

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



    const handleScroll = useCallback((e) => {
        const container = e.target

        if (container.scrollTop === 0 && currentPage < totalPages && !loading) {
            const currentScrollHeight = container.scrollHeight
            scrollPositionRef.current = currentScrollHeight
            fetchMessages(currentPage + 1)
        }
    }, [currentPage, totalPages, loading])


    return (
        <div className="nexus-ai" style={{
            backgroundImage: "url('/back3.png')",
            backgroundSize: "cover",
            backgroundPosition: "center"
        }}>
            {/* Header */}
            <div className="nexus-header">
                <div className="nexus-header-left">
                    <div className="nexus-avatar">
                        <Sparkles size={20} />
                    </div>
                    <div className="nexus-header-info">
                        <div className="nexus-title-row">
                            <h2>Nexus AI</h2>
                            {/* <span className="nexus-badge">AI Assistant</span> */}
                        </div>
                        <p className="nexus-tagline">Always here to help</p>
                    </div>
                </div>
                {/* <div className="nexus-header-actions">
                    <button className="icon-btn"><Search size={18} /></button>
                    <button className="icon-btn"><Video size={18} /></button>
                    <button className="icon-btn"><MoreVertical size={18} /></button>
                </div> */}
            </div>

            {/* Messages Area */}
            <div
                ref={messagesContainerRef}
                onScroll={handleScroll}
                className="nexus-messages"
            >
                {loading && currentPage > 1 && (
                    <div className="nexus-loading">
                        <div className="nexus-spinner"></div>
                    </div>
                )}


                {messages.map((item, idx) => {
                    const time = new Date(item.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                    }).toUpperCase();

                    const isLastMessage = idx === messages.length - 1;

                    return (
                        <div
                            key={item.id}
                            className={`nexus-message-row ${item.isOwn ? 'own' : 'other'}`}
                        >
                            {!item.isOwn && (
                                <div className="nexus-message-avatar">
                                    <Sparkles size={14} />
                                </div>
                            )}

                            <div className={`nexus-message-col ${item.isOwn ? 'own' : 'other'}`}>
                                {!item.isOwn && activeChat.isGroupChat && (
                                    <span className="nexus-sender-name">
                                        {item.sender.name}
                                    </span>
                                )}

                                {item?.attachments && item?.attachments?.length > 0 && (
                                    <div className="nexus-attachments">
                                        {item?.attachments.map((attachment, index) => {
                                            if (attachment?.attachmentType === 'image') {
                                                return (<img
                                                    key={index}
                                                    src={attachment?.url}
                                                    alt={attachment?.fileName || 'Image'}
                                                    className="nexus-attachment-image"
                                                    onClick={() => window.open(attachment.url, '_blank')}
                                                    loading="lazy"
                                                />)
                                            } else if (attachment?.attachmentType === 'pdf') {
                                                return (
                                                    <div
                                                        key={index}
                                                        className="nexus-attachment-file"
                                                        onClick={() => window.open(attachment.url, '_blank')}
                                                    >
                                                        <div className="file-icon">
                                                            <FileText size={24} />
                                                        </div>
                                                        <div className="file-info">
                                                            <p className="file-name">
                                                                {attachment.fileName || 'PDF'}
                                                            </p>
                                                            <p className="file-meta">
                                                                {attachment.fileType || 'PDF'} • {(attachment.size / 1024).toFixed(1)} KB
                                                            </p>
                                                        </div>
                                                        <ExternalLink size={16} className="file-external" />
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })}
                                    </div>
                                )}

                                {/* message bubble */}
                                <div className={`nexus-bubble ${item.isOwn ? 'own' : 'other'}`}>
                                    <div className="nexus-bubble-text">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                                            ul: ({ children }) => (
                                                <ul className="md-ul">{children}</ul>
                                            ),
                                            li: ({ children }) => (
                                                <li className="md-li">{children}</li>
                                            ),
                                            strong: ({ children }) => (
                                                <strong className="md-strong">{children}</strong>
                                            ),
                                            p: ({ children }) => (
                                                <p className="md-p">{children}</p>
                                            ),
                                            br: () => <br className="md-br" />,
                                            h1: ({ children }) => (
                                                <h1 className="md-h1">{children}</h1>
                                            ),
                                            h2: ({ children }) => (
                                                <h2 className="md-h2">{children}</h2>
                                            ),
                                        }}>
                                            {item.text}
                                        </ReactMarkdown>
                                    </div>

                                    <div className={`nexus-bubble-meta ${item.isOwn ? 'own' : 'other'}`}>
                                        <span className={`nexus-time ${item.isOwn ? 'own' : 'other'}`}>{time}</span>
                                        {item.isOwn && (
                                            <CheckCheck size={14} className="nexus-read-icon" />
                                        )}
                                    </div>


                                </div>
                            </div>
                        </div>
                    );
                })}

                {isTyping && (
                    <div className="nexus-message-row other">
                        <div className="nexus-message-avatar">
                            <Sparkles size={14} />
                        </div>
                        <div className="nexus-typing-bubble">
                            <div className="nexus-typing-dots">
                                <span></span><span></span><span></span>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="nexus-input-container">

                {attachments.length > 0 && (
                    <div className="nexus-attachments-preview">
                        <div className="attachments-preview-list">
                            {attachments.map((att, index) => (
                                <div className='attachment-preview-item' key={index}>
                                    {att.type.startsWith("image/") ? (
                                        <img src={att.preview} alt={att.name} className="preview-image" />
                                    ) : (
                                        <div className="preview-file">
                                            <div className="file-icon">
                                                <FileText size={24} />
                                            </div>
                                            <div className="file-info">
                                                <p className="file-name">
                                                    {att.name || 'PDF'}
                                                </p>
                                                <p className="file-meta">
                                                    {att.type || 'PDF'} • {(att.size / 1024).toFixed(1)} KB
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    <button
                                        onClick={() => handleRemoveAttachment(index)}
                                        className="preview-remove-btn"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}


                <div className="nexus-input-row">
                    {showAttachmentModal && (
                        <div ref={modalRef} className="nexus-attachment-modal">
                            <button
                                onClick={() => handleAttachmentClick('image')}
                                className="modal-option"
                            >
                                <Image size={20} className="modal-icon-image" />
                                <span>Image</span>
                            </button>

                            <button
                                onClick={() => handleAttachmentClick('pdf')}
                                className="modal-option"
                            >
                                <FileText size={20} className="modal-icon-pdf" />
                                <span>Document</span>
                            </button>
                        </div>
                    )}

                    <button
                        onClick={() => setShowAttachmentModal(!showAttachmentModal)}
                        className="attachment-btn"
                        disabled={uploading}
                    >
                        <Paperclip size={20} />
                    </button>

                    <div className="nexus-input-wrapper">
                        <input
                            type="text"
                            placeholder="Message Nexus AI..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                            className="nexus-message-input"
                        />
                    </div>

                    <button
                        onClick={handleSendMessage}
                        disabled={!message?.trim() || isResponding || isLoading}
                        className={`nexus-send-btn ${!message?.trim() || isResponding}`}
                    >
                        {isLoading ? (
                            <div className="send-loader"></div>
                        ) : isResponding ? (
                            <div className="send-pulse"></div>
                        ) : (
                            <Send size={19} />
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default NexusAI