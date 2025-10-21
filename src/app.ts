import http from 'http'
import path from 'path'
import debugLib from 'debug'
import express, { Request, Response, NextFunction, Application, RequestHandler, Router } from 'express'
import routes from './routes'
import { init as initSocket } from './socket'

const debug = debugLib('laser:web')

export class LaserAccessApp {
    expressApp: Application;
    server: http.Server;

    constructor() {
        this.expressApp = express()
        this.server = new http.Server(this.expressApp)
        initSocket(this.server)
    }

    init() {
        routes.addMiddleware(this.expressApp)
        this.expressApp.use('/', routes.router)

        routes.addErrorHandlers(this.expressApp)

        this.expressApp.set('views', path.join(__dirname, '..', 'views'))
        this.expressApp.set('view engine', 'pug')

        this.expressApp.use(express.static(path.join(__dirname, '..', 'public')))

        this.expressApp.use(function (_req: Request, _res: Response, next: NextFunction) {
            const err = new Error('Not Found') as Error & { status?: number }
            err.status = 404
            console.log("LAA 404 handler")
            next(err)
        })

        this.expressApp.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
            // narrow unknown to Error-like
            const e = err as Error & { status?: number }
            debug(e)
            res.status(e.status || 500)
            console.log("LAA error handler")
            res.render('error', {
                message: e.message || e,
                error: e
            })
        })
    }
}
