import path from 'path'
import debugLib from 'debug'
import fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import fastifyView from '@fastify/view'
import fastifyStatic from '@fastify/static'
import pug from 'pug'
import { LaserController } from './controllers/LaserController'
import socketManager from 'fastify-socket';
import { Server as IOServer } from 'socket.io';

const debug = debugLib('laser:web')

// add an io property to the fastify instance's type signature
declare module 'fastify' {
  interface FastifyInstance {
    io: IOServer
  }
}

export class LaserWebApp {
    laserController: LaserController = new LaserController();
    app: FastifyInstance = fastify({
        logger: {
            level: 'info',
            transport: {
                target: "@fastify/one-line-logger",
            }
        }
    });

    async init() {
        // setup view engine
        await this.app.register(fastifyView, {
            engine: {
                pug
            },
            root: path.join(__dirname, '..', 'views')
        });

        // setup static file delivery
        await this.app.register(fastifyStatic, {
            root: path.join(__dirname, '..', 'public')
        });

        // register socket.io manager with fastify
        await this.app.register(socketManager);
        
        // mount the laser controller routes at '/'
        await this.laserController.setupRoutes(this.app);

        // catch unhandled routes with 404
        this.app.setNotFoundHandler((_request: FastifyRequest, reply: FastifyReply) => {
            const err = new Error('Not Found') as Error & { status?: number }
            err.status = 404
            reply.status(404).send(err)
        });

        // main error handler
        this.app.setErrorHandler((error: Error & { status?: number }, _request: FastifyRequest, reply: FastifyReply) => {
            debug(error)
            reply.status(error.status || 500).view('error', {
                message: error.message || error,
                error: error
            })
        });
    }
}
