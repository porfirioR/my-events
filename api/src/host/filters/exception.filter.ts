import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  BadRequestException,
  Logger
} from '@nestjs/common';
import { JsonWebTokenError } from '@nestjs/jwt';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('AllExceptionsFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    // 🔍 DEBUGGING
    this.logger.error('❌ ===== ERROR =====');
    this.logger.error(`🔍 Type: ${exception?.constructor?.name}`);
    this.logger.error(`📄 Message: ${(exception as any)?.message}`);
    this.logger.error(`🌐 Request: ${request.method} ${request.url}`);
    this.logger.error(`📝 Body: ${JSON.stringify(request.body)}`);
    
    // Full stack trace
    if ((exception as any)?.stack) {
      this.logger.error(`📚 Stack trace:`);
      this.logger.error((exception as any).stack);
    }

    this.logger.error('🔧 Error properties:');
    Object.keys(exception as any).forEach(key => {
      this.logger.error(`   ${key}: ${(exception as any)[key]}`);
    });

    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorMessage: string = 'Internal Server Error';
    let errorDetails: any = null;

    if (exception instanceof BadRequestException) {
      status = HttpStatus.BAD_REQUEST;
      errorMessage = exception.message;
      errorDetails = exception.getResponse();
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      errorMessage = exception.message;
      errorDetails = exception.getResponse();
    } else if (exception instanceof JsonWebTokenError) {
      status = HttpStatus.UNAUTHORIZED;
      errorMessage = 'Invalid Token';
    } else {
      // Generic Error
      errorMessage = (exception as any)?.message || 'Unknown error';
      this.logger.error('❓ Uncategorized error');
    }

    // Create error response
    const errorResponse = {
      status: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: errorMessage,
      details: errorDetails,
      // Just development
      ...(process.env.NODE_ENV === 'development' && {
        stack: (exception as any)?.stack,
        fullError: exception
      })
    };

    this.logger.error(`📤 Response: ${JSON.stringify(errorResponse, null, 2)}`);
    this.logger.error('❌ ===== END ERROR =====');

    response.status(status).json(errorResponse);
  }
}