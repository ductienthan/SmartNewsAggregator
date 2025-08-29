import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import { timeStamp } from "console";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter{
  catch(e: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse()
    const req = host.switchToHttp().getRequest()

    if (e instanceof HttpException) {
      const status = e.getStatus()
      const body = e.getResponse()
      return res.status(status).json({
        statusCode: status,
        path: req.url,
        message: typeof body === 'string' ? body: (body as any).message ?? body,
        timeStamp: new Date().toISOString()
      })
    }
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      path: req.url,
      message: 'Internal server error',
      timeStamp: new Date().toISOString()
    })
  }
}