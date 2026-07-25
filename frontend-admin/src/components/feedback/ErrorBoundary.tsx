import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ErrorState } from './ErrorState'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[AdminErrorBoundary] Unhandled error:', error, info)
  }

  render() {
    return this.state.hasError ? (
      <ErrorState
        title="The admin workspace encountered an error"
        description="Refresh the page to try again."
      />
    ) : (
      this.props.children
    )
  }
}