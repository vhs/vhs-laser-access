import debugLib from 'debug'
import { grantAccess, getStatus, on as onLaser } from '../laserAccess'
import * as sio from '../socket'
import { Router, Request, Response, NextFunction } from 'express'

const debug = debugLib('laser:web')

export const router = Router()

function laserStatus(_req: Request, res: Response, next: NextFunction) {
  res.locals.status = getStatus()
  next()
}

router.get('/', laserStatus, function (_req: Request, res: Response, _next: NextFunction) {
  res.render('index', { title: 'VHS' })
})

router.all('/api/activate', function (_req: Request, res: Response, next: NextFunction) {
  grantAccess()
  res.locals.result = res.locals.result || {}
  res.locals.result.ok = true
  next()
})

function apiErrorHandler (app: any, path: string) {
  app.use(path, function (err: any, _req: Request, res: Response, _next: NextFunction) {
    const response = {
      msg: err.message,
      type: err.type,
      status: err.statusCode || 500
    }
    if (response.status === 500) {
      debug(err)
    }
    res.status(err.statusCode || 500)
    return res.json(response)
  })
}

export function addMiddleware(app: any) {
  const io = sio.getIo()
  if (io) {
      io.on('connection', function (socket) {
        socket.emit('status', getStatus())
      })
  }
}

export function addErrorHandlers(app: any) {
  apiErrorHandler(app, '/api')
}

onLaser('laser', function (event: any) {
  debug('New event from laser ' + event.id)
  const io = sio.getIo()
  if (io) io.emit('laser', event)
})

onLaser('access', function (event: any) {
  debug('New event from access ' + event.id)
  const io = sio.getIo()
  if (io) io.emit('access', event)
})

onLaser('status', function (event: any) {
  debug('New event from status ' + event.id)
  const io = sio.getIo()
  if (io) io.emit('status', event)
})

export default { router, addErrorHandlers, addMiddleware }
