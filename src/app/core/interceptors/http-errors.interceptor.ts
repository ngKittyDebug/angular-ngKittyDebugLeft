import type { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AppNotificationService } from '@core/services/app-notification.service';
import { errorResponseMessageFormatterForNotification } from '@shared/helpers/error-response-message';
import type { ErrorApiResponseMessage } from '@shared/models/errors-api-response-message.model';
import { catchError, throwError } from 'rxjs';

export const httpErrorsInterceptor: HttpInterceptorFn = (request, next) => {
  const notification = inject(AppNotificationService);

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      const serverError: ErrorApiResponseMessage = error.error as ErrorApiResponseMessage;

      const formattedMessage = errorResponseMessageFormatterForNotification(serverError);

      notification.showErrorNotification(formattedMessage.message, formattedMessage.label);

      return throwError(() => error);
    }),
  );
};
