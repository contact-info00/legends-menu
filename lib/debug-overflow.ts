/**
 * Debug utility to detect horizontal overflow in development
 * Only runs in development mode
 */

export function detectOverflow() {
  if (process.env.NODE_ENV !== 'development') {
    return
  }

  if (typeof window === 'undefined') {
    return
  }

  const checkOverflow = () => {
    const body = document.body
    const html = document.documentElement

    // Check body and html
    const bodyOverflow = body.scrollWidth > body.clientWidth
    const htmlOverflow = html.scrollWidth > html.clientWidth

    if (bodyOverflow || htmlOverflow) {
      console.warn('⚠️ Horizontal overflow detected!')
      console.log('Body scrollWidth:', body.scrollWidth, 'clientWidth:', body.clientWidth)
      console.log('HTML scrollWidth:', html.scrollWidth, 'clientWidth:', html.clientWidth)

      // Find elements causing overflow
      const allElements = document.querySelectorAll('*')
      const overflowElements: Array<{ element: Element; scrollWidth: number; clientWidth: number }> = []

      allElements.forEach((el) => {
        if (el instanceof HTMLElement) {
          const scrollWidth = el.scrollWidth
          const clientWidth = el.clientWidth
          if (scrollWidth > clientWidth && clientWidth > 0) {
            overflowElements.push({ element: el, scrollWidth, clientWidth })
          }
        }
      })

      if (overflowElements.length > 0) {
        console.warn('Elements causing overflow:', overflowElements.slice(0, 5))
        overflowElements.slice(0, 5).forEach(({ element, scrollWidth, clientWidth }) => {
          console.log(
            'Element:',
            element,
            `scrollWidth: ${scrollWidth}px, clientWidth: ${clientWidth}px, diff: ${scrollWidth - clientWidth}px`
          )
        })
      }
    }
  }

  // Run on load and after a short delay
  if (document.readyState === 'complete') {
    setTimeout(checkOverflow, 100)
  } else {
    window.addEventListener('load', () => {
      setTimeout(checkOverflow, 100)
    })
  }

  // Also check on resize
  window.addEventListener('resize', checkOverflow)
}


