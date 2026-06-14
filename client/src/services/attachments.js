import api from './api'; // Your axios instance

export const uploadAttachments = async (formData) => {
  const response = await api.post('/messages/send-attachment', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response;
};

export const getAttachmentUrl = async (messageId) => {
  const response = await api.get(`/messages/attachment/${messageId}`);
  return response;
};