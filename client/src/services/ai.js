import api from './api';

export async function streamResponse(formData) {
  const response = await fetch(`${import.meta.env.VITE_API_URL}/ai/chat`, {
    method: "POST",
    // headers: {
    //   'Content-Type': 'multipart/form-data'
    // },
    body: formData,
    credentials: 'include'
  })
  return response
}

export async function askAi(userQuery,chatId) {
  const response = await fetch(`${import.meta.env.VITE_API_URL}/ai/assistant/${chatId}`, {
    method: "POST",
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ userQuery }),
    credentials: 'include'
  })
  return response
}

