import { Effect, Schema } from 'effect'
import { HttpApiMiddleware } from 'effect/unstable/httpapi'

export class ValidationError extends Schema.ErrorClass<ValidationError>('ValidationError')(
  {
    code: Schema.Literal('validation_error'),
    message: Schema.String,
  },
  { httpApiStatus: 400 },
) {}

export class UnauthorizedError extends Schema.ErrorClass<UnauthorizedError>('UnauthorizedError')(
  {
    code: Schema.Literal('unauthorized'),
    message: Schema.Literal('Authentication required'),
  },
  { httpApiStatus: 401 },
) {}

export class ForbiddenError extends Schema.ErrorClass<ForbiddenError>('ForbiddenError')(
  {
    code: Schema.Literal('forbidden'),
    message: Schema.Literal('Profile access denied'),
  },
  { httpApiStatus: 403 },
) {}

export class NotFoundError extends Schema.ErrorClass<NotFoundError>('NotFoundError')(
  {
    code: Schema.String,
    message: Schema.String,
  },
  { httpApiStatus: 404 },
) {}

export class InternalApiError extends Schema.ErrorClass<InternalApiError>('InternalApiError')(
  {
    code: Schema.Literal('internal_error'),
    message: Schema.Literal('Internal server error'),
  },
  { httpApiStatus: 500 },
) {}

export class ServiceUnavailableError extends Schema.ErrorClass<ServiceUnavailableError>(
  'ServiceUnavailableError',
)(
  {
    code: Schema.Literal('service_unavailable'),
    message: Schema.String,
  },
  { httpApiStatus: 503 },
) {}

export const validationError = (message = 'Invalid request') =>
  new ValidationError({ code: 'validation_error', message })

export const unauthorizedError = () =>
  new UnauthorizedError({ code: 'unauthorized', message: 'Authentication required' })

export const forbiddenError = () =>
  new ForbiddenError({ code: 'forbidden', message: 'Profile access denied' })

export const internalApiError = () =>
  new InternalApiError({ code: 'internal_error', message: 'Internal server error' })

export const serviceUnavailableError = (message = 'Service temporarily unavailable') =>
  new ServiceUnavailableError({ code: 'service_unavailable', message })

export class RequestValidation extends HttpApiMiddleware.Service<RequestValidation>()(
  '@mons/api/RequestValidation',
  { error: ValidationError },
) {}

export const requestValidationLayer = HttpApiMiddleware.layerSchemaErrorTransform(
  RequestValidation,
  (_error, { endpoint }) =>
    Effect.fail(
      validationError(
        endpoint.identifier === 'searchFoods' ? 'Invalid search query' : 'Invalid request',
      ),
    ),
)
