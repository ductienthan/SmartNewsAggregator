import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from "@nestjs/common"
import { Prisma } from '@prisma/client'

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaClientExceptionFilter implements ExceptionFilter {
  catch(e: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse()
    if (e.code === 'P2002') {
      return res.status(HttpStatus.CONFLICT).json({
        statusCode: HttpStatus.CONFLICT,
        message: 'Unique constraint failed',
        meta: e.meta
      })
    }
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: `Prisma error ${e.code}`
    })
  }
}