import toast from 'react-hot-toast'

const ADMIN_TOAST_OPTIONS = {
  position: 'top-center' as const,
  style: {
    borderRadius: '0.5rem',
    maxWidth: '36rem',
    width: 'calc(100% - 2rem)',
    marginTop: '0.5rem',
    fontSize: '0.9375rem',
    fontWeight: 500,
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)',
  },
}

export function adminNotifyLoading(message: string, id?: string): string {
  return toast.loading(message, {
    ...ADMIN_TOAST_OPTIONS,
    id,
  })
}

export function adminNotifySuccess(message: string, id?: string): string {
  return toast.success(message, {
    ...ADMIN_TOAST_OPTIONS,
    id,
    duration: 4000,
    icon: '✓',
  })
}

export function adminNotifyError(message: string, id?: string): string {
  return toast.error(message, {
    ...ADMIN_TOAST_OPTIONS,
    id,
    duration: 6500,
    icon: '✕',
  })
}

export function adminNotifyDismiss(id?: string): void {
  if (id) {
    toast.dismiss(id)
  }
}

export async function runAdminOperation<T>(options: {
  loadingMessage: string
  successMessage: string
  errorMessage: string
  operation: () => Promise<T>
  onStart?: () => void
  onSuccess?: (result: T) => void | Promise<void>
  onError?: (error: unknown) => void
}): Promise<T | null> {
  const toastId = adminNotifyLoading(options.loadingMessage)
  options.onStart?.()

  try {
    const result = await options.operation()
    adminNotifySuccess(options.successMessage, toastId)
    await options.onSuccess?.(result)
    return result
  } catch (error) {
    console.error(options.errorMessage, error)
    const message =
      error instanceof Error && error.message.trim().length > 0
        ? error.message
        : options.errorMessage
    adminNotifyError(message, toastId)
    options.onError?.(error)
    return null
  }
}
