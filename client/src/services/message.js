import api from './api';

export const getMessages = (chatId, page) => api.get(`/messages/${chatId}/?page=${page}`)
export const sendMessage = (chatId, content) => api.post(`/messages/${chatId}`, { content })
export const readMessages = (chatId) => api.get(`/read/messages/${chatId}`)
export const getAttachmentUrl = (formdata) => api.post("/attachment", formdata, {
    headers: {
        'Content-Type': 'multipart/form-data'
    }
})
