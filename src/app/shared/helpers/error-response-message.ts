import type { HttpErrorResponse } from '@angular/common/http';
import type { ErrorApiResponseMessage } from '@shared/models/errors-api-response-message.model';

export function errorResponseMessageFormatterForNotification(error: HttpErrorResponse) {
  const body = error.error as Partial<ErrorApiResponseMessage> | null;
  const message = Array.isArray(body?.message) ? body.message.join('\n') : body?.message;

  return {
    label: `${error.name || 'Error'}, Status code: ${error.status}`,
    message: message ?? error.message,
  };
}
