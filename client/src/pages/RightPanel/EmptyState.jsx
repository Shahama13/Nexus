import React from 'react'
import { MessageCircle, Lock, Zap } from 'lucide-react'

export default function EmptyChatState() {
    return (
        <div className="flex-1 flex bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-16 flex-col justify-center items-center relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5 dark:opacity-10">
                <div className="absolute top-20 left-20 w-32 h-32 border-4 border-blue-500 rounded-full"></div>
                <div className="absolute bottom-32 right-32 w-24 h-24 border-4 border-blue-500 rounded-full"></div>
                <div className="absolute top-1/2 left-1/4 w-16 h-16 border-4 border-blue-500 rounded-full"></div>
                <div className="absolute bottom-1/3 right-1/4 w-20 h-20 border-4 border-blue-500 rounded-full"></div>
                <div className="absolute top-1/4 right-1/3 w-12 h-12 border-4 border-blue-500 rounded-full"></div>
            </div>

            <div className="max-w-2xl text-center z-10">
                {/* Main Illustration */}
                <div className="relative mb-12">
                    {/* Central Chat Icon */}
                    <div className="mx-auto w-32 h-32 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mb-8 shadow-2xl shadow-blue-500/30">
                        <MessageCircle size={64} className="text-white" strokeWidth={1.5} />
                    </div>

                    {/* Floating Message Bubbles */}
                    <div className="relative">
                        {/* Left Bubble */}
                        <div className="absolute -left-20 -top-16 w-48 h-24 bg-white dark:bg-gray-800 shadow-lg rounded-2xl rounded-bl-none p-4 transform -rotate-6 animate-float">
                            <div className="space-y-2">
                                <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                                <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                                <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                            </div>
                        </div>

                        {/* Right Bubble */}
                        <div className="absolute -right-20 -top-16 w-48 h-24 bg-blue-500 shadow-lg rounded-2xl rounded-br-none p-4 transform rotate-6 animate-float-delayed">
                            <div className="space-y-2">
                                <div className="h-2.5 bg-blue-400 rounded w-full"></div>
                                <div className="h-2.5 bg-blue-400 rounded w-2/3"></div>
                                <div className="h-2.5 bg-blue-400 rounded w-3/4"></div>
                            </div>
                        </div>

                        {/* Bottom Left Small Bubble */}
                        <div className="absolute -left-32 top-20 w-32 h-16 bg-white dark:bg-gray-800 shadow-lg rounded-2xl rounded-bl-none p-3 transform -rotate-3 animate-float">
                            <div className="space-y-2">
                                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                            </div>
                        </div>

                        {/* Bottom Right Small Bubble */}
                        <div className="absolute -right-32 top-20 w-32 h-16 bg-blue-500 shadow-lg rounded-2xl rounded-br-none p-3 transform rotate-3 animate-float-delayed">
                            <div className="space-y-2">
                                <div className="h-2 bg-blue-400 rounded w-full"></div>
                                <div className="h-2 bg-blue-400 rounded w-3/4"></div>
                            </div>
                        </div>
                    </div>

                    {/* Floating Particles */}
                    <div className="absolute -top-8 right-1/4 w-3 h-3 bg-blue-500 rounded-full animate-bounce"></div>
                    <div className="absolute top-1/2 -right-12 w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-100"></div>
                    <div className="absolute -bottom-4 left-1/3 w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce delay-200"></div>
                    <div className="absolute bottom-1/4 -left-8 w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-300"></div>
                </div>

                {/* Text Content */}
                <h2 className="text-4xl font-bold mb-4  dark:text-white bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                    ConvoX for Desktop
                </h2>
                <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed mb-8">
                    Send and receive messages instantly. Stay connected with your friends and family.
                </p>

                {/* Features */}
                <div className="flex justify-center gap-8 mb-12">
                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                            <Lock size={18} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="font-medium">End-to-end encrypted</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                            <Zap size={18} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="font-medium">Fast & Reliable</span>
                    </div>
                </div>

                {/* CTA Text */}
                <div className="inline-flex items-center gap-2 px-6 py-3 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-700 dark:text-blue-300">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium">Select a chat to start messaging</span>
                </div>
            </div>

            <style jsx>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0px) rotate(-6deg); }
                    50% { transform: translateY(-10px) rotate(-6deg); }
                }
                @keyframes float-delayed {
                    0%, 100% { transform: translateY(0px) rotate(6deg); }
                    50% { transform: translateY(-10px) rotate(6deg); }
                }
                .animate-float {
                    animation: float 3s ease-in-out infinite;
                }
                .animate-float-delayed {
                    animation: float-delayed 3s ease-in-out infinite;
                    animation-delay: 0.5s;
                }
                .delay-100 { animation-delay: 0.1s; }
                .delay-200 { animation-delay: 0.2s; }
                .delay-300 { animation-delay: 0.3s; }
            `}</style>
        </div>
    )
}