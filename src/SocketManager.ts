import { Server as HttpServer } from 'http'
import { Server as IOServer } from 'socket.io'

class SocketManager {
    io: IOServer | null = null
    init(server: HttpServer) {
        this.io = new IOServer(server)
    }
}

export const socketManager = new SocketManager()
