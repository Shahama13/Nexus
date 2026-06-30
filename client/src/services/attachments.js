import api from './api';

export const sendAttachments = async (formData) => {
  const response = await api.post('/messages/send-attachment', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response;
};

export const getAttachmentUrl = (formdata) => api.post("/attachment", formdata, {
  headers: {
    'Content-Type': 'multipart/form-data'
  }
})
