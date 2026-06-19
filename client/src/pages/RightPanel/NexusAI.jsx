import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Paperclip, Smile, Send, Image, FileText, FileTextIcon, ExternalLink } from 'lucide-react'
import { useUIStore } from '../../store/uiStore'
import { JOIN_CHAT_EVENT, TOGGLE_REACTION_EVENT, NEW_MESSAGE_EVENT, TYPING, USER_ONLINE_EVENT, USER_OFFLINE_EVENT, CHECK_ONLINE_EVENT } from '../../constants/events'
import { useAuth } from '../../store/auth'
import { useSocketEvents } from '../../hooks/useSocketEvents'
import {  getMessages, sendMessage } from '../../services/message'
import { flushSync } from 'react-dom'
import { Reply, X } from 'lucide-react'
import moment from 'moment/moment'
import { streamResponse } from '../../services/ai'
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import AttachmentModal from '../../components/AttachmentModal'
import { getAttachmentUrl } from '../../services/attachments'

const NexusAI = () => {
    const [message, setMessage] = useState('')
    const [isResponding, setIsResponding] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [showAttachmentModal, setShowAttachmentModal] = useState(false)
    const [attachments, setAttachments] = useState([]);
    const [uploading, setUploading] = useState(false);

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

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView()
    }, [messages])

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                setShowAttachmentModal(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
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

            console.log(file, "FILE IS HERERE")

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
        const tempId = crypto.randomUUID();
        let attachment = []
        const hasPDF = attachments.some(att => att.type === 'application/pdf');
        const pdfFile = attachments.find(att => att.type === 'application/pdf');


        if (attachments.length > 0 && !hasPDF) {
            const formData = new FormData()
            formData.append('attachment', attachments[0].file);
            const { data } = await getAttachmentUrl(formData)
            console.log("Attachment url", data)
            attachment.push(data.attachment)
        }

        if (attachments.length > 0 && hasPDF) {
            const formData = new FormData()
            formData.append('attachment', attachments[0].file);
            const { data } = await getAttachmentUrl(formData)
            console.log("Attachment url", data)
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
                                        sender: { name: user.name, _id: user._id },
                                        text: result,
                                        isOwn: false,
                                    }
                                ]
                            })

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
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-semibold">
                            🤖
                        </div>

                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Nexus AI</h2>


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


                    return (
                        <div
                            key={item.id}

                            className={`flex ${item.isOwn ? 'justify-end' : 'justify-start'} items-start gap-2`}
                        >


                            <div className={`flex flex-col ${item.isOwn ? 'items-end' : 'items-start'} max-w-3xl`}>
                                {!item.isOwn && activeChat.isGroupChat && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400 mb-1 px-1">
                                        {item.sender.name}
                                    </span>
                                )}

                                {item?.attachments && item?.attachments?.length > 0 && (
                                    <div className="space-x-2 flex flex-row mb-2">
                                        {item?.attachments.map((attachment, index) => {
                                            if (attachment?.attachmentType === 'image') {
                                                return (<img
                                                    src={attachment?.url}
                                                    alt={attachment?.fileName || 'Image'}
                                                    className="w-[30vw] rounded-lg cursor-pointer hover:opacity-90 transition "
                                                    onClick={() => window.open(attachment.url, '_blank')}
                                                    loading="lazy"
                                                />)
                                            } else if (attachment?.attachmentType === 'pdf') {
                                                return (
                                                    <div
                                                        key={index}
                                                        className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                                                        onClick={() => window.open(attachment.url, '_blank')}
                                                    >
                                                        <div className="flex-shrink-0">
                                                            <FileText size={24} className="text-red-500" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                                {attachment.fileName || 'PDF'}
                                                            </p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                                {attachment.fileType || 'PDF'} • {(attachment.size / 1024).toFixed(1)} KB
                                                            </p>
                                                        </div>
                                                        <ExternalLink size={16} className="text-gray-400 flex-shrink-0" />
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })}
                                    </div>
                                )}




                                {/* message bubble */}
                                <div
                                    className={`py-2 pb-3 relative rounded-2xl shadow-sm ${item.isOwn
                                        ? 'bg-blue-500 text-white rounded-tr-none'
                                        : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-tl-none'
                                        }  ${item?.reactions && Object.keys(item?.reactions).length > 0 ? "mb-3" : ""}`}
                                >

                                    <div className="px-4">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {item.text}
                                        </ReactMarkdown>
                                    </div>

                                </div>
                            </div>
                        </div>
                    );
                })}



                <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className={`flex-shrink-5 border-none bg-white  m-4 dark:bg-gray-800 border-t border-gray-200 rounded-b-4xl dark:border-gray-700  py-2 rounded-t-4xl`}>

                {attachments.length > 0 && (
                    <div className="px-4 mb-2">
                        <div className="flex flex-wrap gap-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                            {attachments.map((att, index) => (
                                // <FileAttachment att={att} index={index} handleRemoveAttachment={handleRemoveAttachment} key={index} />
                                <div className='relative group'>
                                    {att.type.startsWith("image/") ? <img src={att.preview} alt={att.name} className="w-20 h-20 object-cover rounded-lg" /> :


                                        <div
                                            key={index}
                                            className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                                        >
                                            <div className="flex-shrink-0">
                                                <FileText size={24} className="text-red-500" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                    {att.name || 'PDF'}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {att.type || 'PDF'} • {(att.size / 1024).toFixed(1)} KB
                                                </p>
                                            </div>
                                        </div>
                                    }
                                    <button
                                        onClick={() => handleRemoveAttachment(index)}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 
                                                        opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer
                                                        hover:bg-red-600 focus:outline-none"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}

                        </div>
                    </div>
                )}


                <div className="flex relative items-center gap-3 px-6">
                    {showAttachmentModal && (
                        // <AttachmentModal setAttachments={setAttachments} setShowAttachmentModal={setShowAttachmentModal} />

                        <div
                            ref={modalRef}
                            className="absolute bottom-14 left-4 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50"
                        >
                            
                                <button
                                    onClick={() => handleAttachmentClick('image')}
                                    className="w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <Image size={20} className="text-green-500" />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">Image</span>
                                </button>
                           

                           
                                <button
                                    onClick={() => handleAttachmentClick('pdf')}
                                    className="w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <FileText size={20} className="text-red-500" />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">Document</span>
                                </button>
                           
                        </div>
                    )}

                    <button
                        onClick={() => setShowAttachmentModal(!showAttachmentModal)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors flex-shrink-0"
                        disabled={uploading}
                    >
                        <Paperclip size={20} className="text-gray-600 dark:text-gray-400" />
                    </button>

                    <div className="flex-1 relative">
                        <input
                            type="text"
                            placeholder="Type a message..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                            className="w-full px-4 py-3 outline-none bg-inherit text-gray-900 dark:text-white rounded-full focus:outline-none focus:ring-0 "
                        />

                    </div>
                    <button
                        onClick={handleSendMessage}
                        disabled={!message?.trim() || isResponding || isLoading}
                        className={`
                            p-3 rounded-full transition-all duration-200 flex-shrink-0 
                            flex items-center justify-center
                            w-12 h-12 
                            ${!message?.trim() || isResponding || isLoading
                                ? 'bg-blue-400 cursor-not-allowed opacity-70'
                                : 'bg-blue-500 hover:bg-blue-600'
                            }
                        `}
                    >
                        {isLoading ? (
                            // Loader/Spinner
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                        ) : isResponding ? (
                            // Blinking Square - Fixed size
                            <div className="h-5 w-5 bg-white animate-pulse rounded-sm flex-shrink-0"></div>
                        ) : (
                            <Send size={20} className="text-white flex-shrink-0" />
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default NexusAI
