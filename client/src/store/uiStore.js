import { create } from 'zustand'

export const useUIStore = create((set) => ({
    activeChat: null,
    setActiveChat: (val) => set(() => ({ activeChat: val })),

    setLeftView: (view) => set(() => ({ leftView: view })),
    leftView: 'CHAT_LIST',

    setRightView: (view) => set(() => ({ rightView: view })),
    rightView: '',

    isAddChatModalOpen: false,
    setIsAddChatModalOpen: (view) => set(() => ({ isAddChatModalOpen: view })),

    chatDetailId:"",
    isDetailsModal: false,
    setChatDetailId: (id) => set(() => ({ chatDetailId: id })),
    setIsDetailsModalOpen: (view) => set(() => ({ isDetailsModal: view })),

    

}))

