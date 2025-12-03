import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { manager } from '../hardware/LaserAccessManager'
import { config } from '../Configuration';
import { mqttManager } from '../comms/MqttManager';
import { JwtPayload } from './LoginController';

export function ApiController(instance: FastifyInstance, _: any, done: () => void) {
  // Activate route
  instance.all('/activate', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!config.skipAuth) {
      try {
        await request.jwtVerify();  // Verify the JWT token
      } catch {
        reply.redirect('/login')
        return;
      }
    }

    let user = request.user as JwtPayload;
    mqttManager.sendUsage("activate", user.userId);
    manager.grantAccess()
    return { ok: true }
  })

  done();
}