'use client';

import { Component, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

type State = { error: Error | null };

/** Isolates security UI so a render error cannot blank the whole profile. */
export default class SecurityErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <section className="profile-panel profile-security-section" id="security">
          <h2 className="font-display text-lg font-semibold">قسم الحماية</h2>
          <p className="mt-2 text-sm text-destructive">
            تعذر عرض قسم الحماية. حدّث الصفحة (Ctrl+F5).
          </p>
          <pre
            className="mt-3 overflow-auto rounded-lg border border-border bg-secondary p-3 text-[11px] text-muted-foreground"
            dir="ltr"
          >
            {this.state.error.message}
          </pre>
          <button
            type="button"
            className="profile-btn-primary mt-4"
            onClick={() => this.setState({ error: null })}
          >
            إعادة المحاولة
          </button>
        </section>
      );
    }
    return this.props.children;
  }
}
