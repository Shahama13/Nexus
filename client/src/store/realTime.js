import { create } from 'zustand'

export const useRealTime = create((set) => ({

    unreadByChat: {},
    lastMessage: {},

    addLastMessage: ({ chatId, content, sender }) =>
        set((state) => (
            {
                lastMessage: {
                    ...state.lastMessage,
                    [chatId]: { content, sender },
                },

            })),

    addUnread: (chatId) =>
        set((state) => ({
            unreadByChat: {
                ...state.unreadByChat,
                [chatId]: (state.unreadByChat[chatId] || 0) + 1,
            },
        })),

    removeUnread: (chatId) =>
        set((state) => {
            const { [chatId]: _, ...rest } = state.unreadByChat;
            return {
                unreadByChat: { ...rest }
            }

        })
}))

