"use client";
import { Component, ReactNode } from "react";
import FallbackView from "./FallbackView";

type Props = {
  children: ReactNode;
  onReset?: () => void;
};

type State = { hasError: boolean };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // Optional: log error to telemetry here
    console.error("Boundary caught:", error);
  }

  handleReset = () => {
    this.setState({ hasError: false });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <FallbackView
          title="Component failed to load"
          message="You can try again or go back."
          onRetry={this.handleReset}
        />
      );
    }
    return this.props.children;
  }
}

// HOC for convenience
export const withErrorBoundary =
  <P extends object>(Comp: React.ComponentType<P>, onReset?: () => void) =>
  (props: P) =>
    (
      <ErrorBoundary onReset={onReset}>
        <Comp {...props} />
      </ErrorBoundary>
    );
