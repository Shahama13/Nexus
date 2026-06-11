import React, { useEffect, useState } from 'react'
import { MessageSquare, Heart, Users, Settings, Zap, Compass } from 'lucide-react'
import { useUIStore } from '../store/uiStore';
import { useRealTime } from '../store/realTime';

export default function Sidebar() {
    const { leftView, setLeftView } = useUIStore()
    const { unreadByChat } = useRealTime()


    return (
        <div className="w-16 h-screen bg-white dark:bg-slate-800 flex flex-col items-center py-4 border-r border-gray-200 dark:border-slate-700">
            {/* Top Icons */}
            <div className="flex flex-col items-center gap-6">
                {/* Chats Icon */}
                <button
                    onClick={() => setLeftView('CHAT_LIST')}
                    className={`p-3 relative rounded-xl transition-all ${leftView === 'CHAT_LIST'
                        ? 'bg-blue-100 dark:bg-slate-700 text-blue-600 dark:text-white'
                        : 'text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white hover:bg-blue-50 dark:hover:bg-slate-700/50'
                        }`}
                    title="Chats"
                >
                    <MessageSquare size={22} />
                    {Object.entries(unreadByChat).length > 0 &&
                        <div className='absolute top-0 right-1 bg-blue-600 py-1 px-2 rounded-full text-xs'>
                            {Object.entries(unreadByChat).length}
                        </div>
                    }

                </button>



            </div>

            {/* Spacer */}
            <div className="flex-1"></div>

            {/* Bottom Icons */}
            <div className="flex flex-col items-center gap-6">
                {/* Settings Icon */}
                <button
                    onClick={() => setLeftView('MY_PROFILE')}
                    className={`p-3 rounded-xl transition-all ${leftView === 'MY_PROFILE'
                        ? 'bg-blue-100 dark:bg-slate-700 text-blue-600 dark:text-white'
                        : 'text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white hover:bg-blue-50 dark:hover:bg-slate-700/50'
                        }`}
                    title="Settings"
                >
                    <Settings size={22} />
                </button>

                {/* Logo/Profile */}
                <button
                    onClick={() => setLeftView('profile')}
                    className="relative group"
                    title="Profile"
                >
                    <div className="w-10 h-10 bg-gradient-to-br from-green-400 via-green-500 to-green-600 rounded-lg flex items-center justify-center shadow-lg overflow-hidden">
                        {/* Stylized "S" or leaf pattern */}
                        <div className="relative w-full h-full flex items-center justify-center">
                            <div className="absolute w-7 h-8 bg-gradient-to-br from-green-300 to-green-500 rounded-tl-full rounded-br-full transform -rotate-12"></div>
                            <div className="absolute w-6 h-7 bg-gradient-to-br from-green-400 to-green-600 rounded-tr-full rounded-bl-full transform rotate-12 -translate-x-1"></div>
                            <div className="absolute w-5 h-6 bg-gradient-to-br from-green-500 to-green-700 rounded-tl-full rounded-br-full transform -rotate-12 translate-x-1 translate-y-0.5"></div>
                        </div>
                    </div>
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white dark:border-slate-800"></div>
                </button>
            </div>
        </div>
    )
}