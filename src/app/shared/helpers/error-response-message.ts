import type { ErrorApiResponseMessage } from '@shared/models/errors-api-response-message.model';

export function errorResponseMessageFormatterForNotification(serverError: ErrorApiResponseMessage) {
  if (!serverError) {
    return { label: 'Unknown Error', message: 'unknown error from backend' };
  }

  const message = Array.isArray(serverError.message)
    ? serverError.message.join('\n')
    : serverError.message;

  return {
    label: `${serverError.error}, Status code: ${serverError.statusCode}`,
    message,
  };
}
