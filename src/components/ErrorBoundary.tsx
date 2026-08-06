import { Component, type ReactNode } from 'react';
import { en } from '../i18n/en';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    // Always English: the locale lives in the tree that just crashed.
    return (
      <div className="error-screen">
        <p className="error-screen-mark">{en.brandMark}</p>
        <h1 className="error-screen-title">{en.errorTitle}</h1>
        <p className="error-screen-body">{en.errorBody}</p>
        <button
          type="button"
          className="btn primary"
          onClick={() => this.setState({ hasError: false })}
        >
          {en.errorRetry}
        </button>
      </div>
    );
  }
}
