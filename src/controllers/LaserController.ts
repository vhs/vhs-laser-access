import debugLib from 'debug'
import { manager, LaserStatusEvent } from '../hardware/LaserAccessManager'
import * as sio from '../socket'
import { Router, Request, Response, NextFunction, Application } from 'express'

const debug = debugLib('laser:web')

export class LaserController {
  public router: Router

  constructor() {
    this.router = Router()
    this.registerRoutes()
    this.registerEventHandlers()
  }

  private registerRoutes() {
    this.router.get('/', this.laserStatus.bind(this), (_req: Request, res: Response) => {
      res.render('index', { title: 'VHS' })
    })

    this.router.all('/api/activate', (_req: Request, res: Response, next: NextFunction) => {
      manager.grantAccess()
      res.locals.result = res.locals.result || {}
      res.locals.result.ok = true
    })
  }

  private laserStatus(_req: Request, res: Response, next: NextFunction) {
    res.locals.status = manager.getStatus()
    next()
  }

  public addMiddleware(app: Application) {
    const io = sio.getIo()
    if (io) {
      io.on('connection', (socket) => {
        socket.emit('status', manager.getStatus())
      })
    }
  }

  public addErrorHandlers(app: Application) {
    app.use('/api', (err: any, _req: Request, res: Response, _next: NextFunction) => {
      const response = {
        msg: err?.message,
        type: err?.type,
        status: err?.statusCode || 500
      }
      if (response.status === 500) {
        debug(err)
      }
      res.status(err?.statusCode || 500)
      return res.json(response)
    })
  }

  private registerEventHandlers() {
    manager.on('laser', (event: LaserStatusEvent) => {
      debug('New event from laser ' + event.id)
      const io = sio.getIo()
      if (io) io.emit('laser', event)
    })

    manager.on('access', (event: LaserStatusEvent) => {
      debug('New event from access ' + event.id)
      const io = sio.getIo()
      if (io) io.emit('access', event)
    })

    manager.on('status', (event: LaserStatusEvent) => {
      debug('New event from status ' + event.id)
      const io = sio.getIo()
      if (io) io.emit('status', event)
    })
  }
}
