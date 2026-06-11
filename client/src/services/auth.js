import api from "./api";

export const login = (email, password) => api.post("/auth/login", { email, password })
export const logout = () => api.get("/auth/logout")
export const getMe = () => api.get("/auth/me")
export const signup = (email, password, name) => api.post("/auth/signup", {
    email, password, name
})

