import http from 'http'
import path from 'path'
import debugLib from 'debug'
import express, { Request, Response, NextFunction, Application, RequestHandler, Router } from 'express'
import { LaserController } from './controllers/LaserController'
import { socketManager } from './comms/SocketManager'

const debug = debugLib('laser:web')

export class LaserWebApp {
    expressApp: Application;
    server: http.Server;
    laserController: LaserController;

    constructor() {
        this.expressApp = express();
        this.server = new http.Server(this.expressApp);
        this.laserController = new LaserController();
        socketManager.init(this.server);
    }

    init() {
        // setup view engine & static file delivery
        this.expressApp.set('views', path.join(__dirname, '..', 'views'))
        this.expressApp.set('view engine', 'pug')
        this.expressApp.use(express.static(path.join(__dirname, '..', 'public')))

        // setup socket.io middleware
        this.laserController.addMiddleware(this.expressApp)

        // mount the laser controller routes at '/'
        this.expressApp.use('/', this.laserController.router)

        // laser controller has special error handler for API routes
        this.laserController.addErrorHandlers(this.expressApp)

        // catch unhandled routes, create a 404 error
        this.expressApp.use(function (_req: Request, _res: Response, next: NextFunction) {
            const err = new Error('Not Found') as Error & { status?: number }
            err.status = 404
            next(err)
        })

        // main error handler, renders an html error page
        this.expressApp.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
            // narrow unknown to Error-like
            const e = err as Error & { status?: number }
            debug(e)
            res.status(e.status || 500)
            res.render('error', {
                message: e.message || e,
                error: e
            })
        })
    }
}
