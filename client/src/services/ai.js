import api from './api';

export const streamResponse = () =>  fetch(`${import.meta.env.VITE_API_URL}/v1/ai/chat`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    messages: [
      {
        role: "user",
        content: "Tell me a joke",
      },
    ],
  }),
})


