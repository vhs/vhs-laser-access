import debugLib from 'debug'
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { manager, LaserStatusEvent } from '../hardware/LaserAccessManager'
const debug = debugLib('laser:web')

// this manages the '/' and '/api/activate' routes for the laser web interface
// as well as propagating laser status updates to the frontend via Socket.io
export class LaserController {
  async setupRoutes(app: FastifyInstance) {
    // Root route
    app.get('/', { } , async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.view('index', {
        title: 'VHS',
        status: manager.getStatus()
      })
    })

    // Activate route
    app.all('/api/activate', async (_request: FastifyRequest, reply: FastifyReply) => {
      manager.grantAccess()
      return reply.send({ ok: true })
    })

    // API error handler
    app.setErrorHandler((error: Error & { statusCode?: number }, request: FastifyRequest, reply: FastifyReply) => {
      if (request.url.startsWith('/api')) {
        const response = {
          msg: error?.message,
          type: error?.name,
          status: error?.statusCode || 500
        }
        if (response.status === 500) {
          debug(error)
        }
        return reply.status(error?.statusCode || 500).send(response)
      }
      // Pass to default error handler for non-API routes
      throw error
    })

    this.registerEventHandlers(app)
  }

  private registerEventHandlers(app: FastifyInstance) {
    app.io.on('connection', (socket: any) => {
      socket.emit('status', manager.getStatus())
    })

    manager.on('laser', (event: LaserStatusEvent) => {
      debug('New event from laser ' + event.id)
      app.io.emit('laser', event);
    })

    manager.on('access', (event: LaserStatusEvent) => {
      debug('New event from access ' + event.id)
      app.io.emit('access', event)
    })

    manager.on('status', (event: LaserStatusEvent) => {
      debug('New event from status ' + event.id)
      app.io.emit('status', event)
    })
  }
}
