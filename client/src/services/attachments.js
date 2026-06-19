import api from './api'; // Your axios instance

export const uploadAttachments = async (formData) => {
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
