import api from './api';

export async function streamResponse(message, chatId) {
  const response= await fetch("http://localhost:3000/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message, chatId }),
    credentials: 'include'
  })
  return response
}

