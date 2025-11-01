import debugLib from 'debug'
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { manager, Dispatch } from '../hardware/LaserAccessManager'

const debug = debugLib('laser:web')

// this manages the '/' and '/api/activate' routes for the laser web interface
// as well as propagating laser status updates to the frontend via Socket.io

export async function RootController(instance: FastifyInstance, _: any) {
  // Root route
  instance.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();  // Verify the JWT token
    } catch {
      reply.redirect('/login')
      return;
    }
    
    return reply.view('index', {
      title: 'VHS',
      status: manager.getStatus()
    })
  })

   // setup socket.io events
  instance.io.on('connection', (socket: any) => {
    socket.emit('status', manager.getStatus())
  })

  manager.on(Dispatch.Channel.Laser, (event: Dispatch.ReceivedEvent) => {
    debug('New event from laser ' + event.id)
    instance.io.emit('laser', event);
  })

  manager.on(Dispatch.Channel.Access, (event: Dispatch.ReceivedEvent) => {
    debug('New event from access ' + event)
    instance.io.emit('access', event)
  })

  manager.on(Dispatch.Channel.Status, (event: Dispatch.ReceivedEvent) => {
    debug('New event from status ' + event.id)
    instance.io.emit('status', event)
  })
}
