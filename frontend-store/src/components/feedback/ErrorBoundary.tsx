import { Component, type ReactNode, type ErrorInfo } from 'react'
import { ServerErrorPage } from '@/pages/ServerErrorPage'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

// Error boundaries require class components per React's current model.
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Unhandled error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <ServerErrorPage />
    }
    return this.props.children
  }
}
