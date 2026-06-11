import { useEffect } from "react"

const useSocketEvents = (socket, handlers) => {
    //useEfeect islie use kie h q ki ui pura render hoen bad lsitener lage
  useEffect(() => {
    Object.entries(handlers).forEach(([event, handler]) => {
        //for each islie usse kie q ki ek page pe multiple handlers or clean dunctions ho skte h or bar bar hum func ko call ni kr skte h 
      socket.on(event, handler)
      
    })

    return () => {
        //off islie krre h q ki phle wala off ho jae=ye state change hone pr agr on rha to wsame message dubara stack ho jayega frinetnd me baclend k ni pta
      Object.entries(handlers).forEach(([event, handler]) => {
        socket.off(event, handler)
      })
    }
  }, [socket, handlers])
}

export {useSocketEvents}
