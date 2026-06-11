import api from './api';

export const newGroupChat = (name, participants ) => api.post("/group/new", { name, participants })
export const newUserChat = (receiverId) => api.post(`/chat/new/${receiverId}`, {})
export const getMyChats = () => api.get("/chats/all");
export const searchUsers = () => api.get('/user/search');
export const getGroupChatDetails = (chatId) => api.get(`/group/${chatId}`)
export const deleteGroupChat = (chatId) => api.delete(`/group/${chatId}`)
export const addParticipant = (chatId, participantId) => api.put(`/group/add/${chatId}/${participantId}`)
export const removeParticipant = (chatId, participantId) => api.put(`/group/remove/${chatId}/${participantId}`)
