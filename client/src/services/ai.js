import api from './api';

export async function streamResponse(message, chatId, attachment) {
  const response= await fetch("http://localhost:3000/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message, chatId , attachment}),
    credentials: 'include'
  })
  return response
}

