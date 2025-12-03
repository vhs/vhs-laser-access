import debugLib from 'debug'
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { manager, LaserStatusEvent } from '../hardware/LaserAccessManager'
import { config } from '../Configuration'
import { mqttManager } from '../comms/MqttManager'

const debug = debugLib('laser:web')

// this manages the '/' and '/api/activate' routes for the laser web interface
// as well as propagating laser status updates to the frontend via Socket.io

export async function RootController(instance: FastifyInstance, _: any) {
  // Root route
  instance.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!config.skipAuth) {
      try {
        await request.jwtVerify();  // Verify the JWT token
      } catch {
        reply.redirect('/login')
        return;
      }
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

  manager.on('laser', (event: LaserStatusEvent) => {
    debug('New event from laser ' + event.id)
    mqttManager.sendUsage(event.id, "system");
    instance.io.emit('laser', event);
  })

  manager.on('access', (event: LaserStatusEvent) => {
    debug('New event from access ' + event)
    instance.io.emit('access', event)
  })

  manager.on('status', (event: LaserStatusEvent) => {
    debug('New event from status ' + event.id)
    instance.io.emit('status', event)
  })
}
