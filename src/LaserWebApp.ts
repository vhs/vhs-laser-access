import http from 'http'
import path from 'path'
import debugLib from 'debug'
import express, { Request, Response, NextFunction, Application, RequestHandler, Router } from 'express'
import { LaserController } from './controllers/LaserController'
import { init as initSocket } from './socket'

const debug = debugLib('laser:web')

export class LaserWebApp {
    expressApp: Application;
    server: http.Server;
    laserController: LaserController;

    constructor() {
        this.expressApp = express();
        this.server = new http.Server(this.expressApp);
        this.laserController = new LaserController();
        initSocket(this.server);
    }

    init() {
        this.laserController.addMiddleware(this.expressApp)
        this.expressApp.use('/', this.laserController.router)

        this.laserController.addErrorHandlers(this.expressApp)

        this.expressApp.set('views', path.join(__dirname, '..', 'views'))
        this.expressApp.set('view engine', 'pug')

        this.expressApp.use(express.static(path.join(__dirname, '..', 'public')))

        this.expressApp.use(function (_req: Request, _res: Response, next: NextFunction) {
            const err = new Error('Not Found') as Error & { status?: number }
            err.status = 404
            next(err)
        })

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
