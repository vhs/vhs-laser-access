import debugLib from 'debug'
import { manager, LaserStatusEvent } from '../hardware/LaserAccessManager'
import { socketManager } from '../comms/SocketManager'
import { Router, Request, Response, NextFunction, Application } from 'express'

const debug = debugLib('laser:web')

// this manages the '/' and '/api/activate' routes for the laser web interface
// as well as propagating laser status updates to the frontend via Socket.io
export class LaserController {
  public router: Router

  constructor() {
    this.router = Router()
    this.registerRoutes()
    this.registerEventHandlers()
  }

  private registerRoutes() {
    this.router.get('/', (_req: Request, res: Response) => {
      res.render('index', {
        title: 'VHS',
        status: manager.getStatus()
      });
    })

    this.router.all('/api/activate', (_req: Request, res: Response, next: NextFunction) => {
      manager.grantAccess()
      res.locals.result = res.locals.result || {}
      res.locals.result.ok = true
    })
  }

  public setupStatusSocket(app: Application) {
    if (socketManager.io) {
      socketManager.io.on('connection', (socket: any) => {
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
      if (socketManager.io) socketManager.io.emit('laser', event)
    })

    manager.on('access', (event: LaserStatusEvent) => {
      debug('New event from access ' + event.id)
      if (socketManager.io) socketManager.io.emit('access', event)
    })

    manager.on('status', (event: LaserStatusEvent) => {
      debug('New event from status ' + event.id)
      if (socketManager.io) socketManager.io.emit('status', event)
    })
  }
}
