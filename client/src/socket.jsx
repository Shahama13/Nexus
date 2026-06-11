
import { createContext, useContext, useRef } from "react"
import { io } from "socket.io-client"

const SocketContext = createContext(null)

const useSocket = () => useContext(SocketContext)

const SocketProvider = ({ children }) => {
  const socketRef = useRef(null)

  if (!socketRef.current) {
    socketRef.current = io("http://localhost:3000", {
      withCredentials: true
    })
  }

  return (
    <SocketContext.Provider value={socketRef.current}>
      {children}
    </SocketContext.Provider>
  )
}

export { useSocket, SocketProvider }
