export interface AdminUploadResult {
  key: string
  publicUrl: string
  originalSize?: number
  optimizedSize?: number
}

export interface AdminUploadOptions {
  formData: FormData
  onProgress?: (percent: number | null) => void
}

export function uploadAdminMedia({
  formData,
  onProgress,
}: AdminUploadOptions): Promise<AdminUploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/r2/upload')
    xhr.withCredentials = true

    xhr.upload.onprogress = (event) => {
      if (!onProgress) return
      if (event.lengthComputable && event.total > 0) {
        onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)))
      } else {
        onProgress(null)
      }
    }

    xhr.onload = () => {
      onProgress?.(100)
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as AdminUploadResult)
        } catch {
          reject(new Error('Invalid upload response'))
        }
        return
      }

      try {
        const errorData = JSON.parse(xhr.responseText)
        reject(new Error(errorData.error || 'Upload failed'))
      } catch {
        reject(new Error('Upload failed'))
      }
    }

    xhr.onerror = () => reject(new Error('Upload failed'))
    xhr.onabort = () => reject(new Error('Upload cancelled'))

    onProgress?.(null)
    xhr.send(formData)
  })
}
