import { AxiosError } from 'axios'
import { toast } from 'sonner'
import { extractValidationMessage } from '@/lib/validation-error'

export function handleServerError(error: unknown) {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log(error)
  }

  let errMsg = 'Something went wrong!'

  if (
    error &&
    typeof error === 'object' &&
    'status' in error &&
    Number(error.status) === 204
  ) {
    errMsg = 'No content.'
  }

  if (error instanceof AxiosError) {
    const valMsg = extractValidationMessage(error.response?.data)
    if (valMsg) {
      errMsg = valMsg
    } else {
      const title = error.response?.data?.title || error.response?.data?.message
      if (typeof title === 'string' && title.length > 0 && title !== 'ERROR MAPPING') {
        errMsg = title
      }
    }
  }

  toast.error(errMsg)
}
