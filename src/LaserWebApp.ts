import path from 'path'
import debugLib from 'debug'
import fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import fastifyView from '@fastify/view'
import fastifyStatic from '@fastify/static'
import pug from 'pug'
import { RootController } from './controllers/RootController'
import { ApiController } from './controllers/ApiController'
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
    app: FastifyInstance = fastify({
        logger: {
            level: 'info',
            transport: {
                target: "@fastify/one-line-logger",
            }
        }
    });

    async setup() {
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

        // register the / handler, and setup event passing to socket.io
        await this.app.register(RootController)

        // register the /api handler
        await this.app.register(ApiController, { prefix: '/api' })

        return this;
    }

    setupErrors() {
        // catch unhandled routes with 404
        this.app.setNotFoundHandler((_request: FastifyRequest, reply: FastifyReply) => {
            let err: Error & { status?: number } = new Error("Not found")
            err.status = 404
            throw err;
        });

        // main error handler
        this.app.setErrorHandler((error: Error & { status?: number }, _request: FastifyRequest, reply: FastifyReply) => {
            let statusCode = error?.status || 500
            if (statusCode === 500) {
                debug(error)
            }

            let output = {
                message: error.message || error,
                error: error
            }

            reply.status(statusCode)

            if (_request.raw.url?.startsWith('/api')) {
                // json
                reply.send(output)
            } else {
                // html
                reply.view('error', output)
            }
        });
    }
}
