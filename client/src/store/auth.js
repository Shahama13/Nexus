import { create } from 'zustand'

export const useAuth = create((set) => ({
    user: null,
    users: [],
    loading: true,

    setUser: (user) => set(() => ({ user, loader: false })),
    clearUser: () => set(() => ({ user: null, loader: false })),
    setUsers: (users) => set(() => ({ users }))

}))

