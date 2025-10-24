import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { manager } from '../hardware/LaserAccessManager'

export function LaserApiController(instance: FastifyInstance, _: any, done: () => void) {
  // Activate route
  instance.all('/activate', async (_request: FastifyRequest, reply: FastifyReply) => {
    manager.grantAccess()
    return { ok: true }
  })

  done();
}