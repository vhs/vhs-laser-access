import { Server as HttpServer } from 'http'
import { Server as IOServer } from 'socket.io'

// Singleton class to manage Socket.io server instance
// this is how we propagate laser status updates to the frontend
class SocketManager {
    io: IOServer | null = null
    init(server: HttpServer) {
        this.io = new IOServer(server)
    }
}

export const socketManager = new SocketManager()
