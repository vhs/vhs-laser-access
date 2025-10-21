import { Server as HttpServer } from 'http'
import { Server as IOServer, Socket } from 'socket.io'

let io: IOServer | null = null

export function init(server: HttpServer) {
  io = new IOServer(server)
}

export function getIo(): IOServer | null {
  return io
}

export default { init, getIo }
