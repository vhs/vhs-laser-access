import http from 'http'
import path from 'path'
import debugLib from 'debug'
import express, { Request, Response, NextFunction } from 'express'
import routes from './routes'
import { init as initSocket } from './socket'

const debug = debugLib('laser:web')

const app = express()
const server = new http.Server(app)

initSocket(server)

let init = false

app.set('views', path.join(__dirname, '..', 'views'))
app.set('view engine', 'pug')

export function addHandler(pathStr: string, handler: any) {
  app.use(pathStr, handler)
}

export function startApp() {
  if (!init) {
    routes.addMiddleware(app)
    app.use('/', routes.router)
    routes.addErrorHandlers(app)
    app.use(express.static(path.join(__dirname, '..', 'public')))

    app.use(function (_req: Request, _res: Response, next: NextFunction) {
      const err: any = new Error('Not Found')
      err.status = 404
      next(err)
    })

    app.use(function (err: any, _req: any, res: any, _next: any) {
      debug(err)
      res.status(err.status || 500)
      res.render('error', {
        message: err.message || err,
        error: {}
      })
    })
    init = true
  }
  return app
}

export { server }

export default { addHandler, server, startApp }
