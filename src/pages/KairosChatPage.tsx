import * as React from 'react';
import { Page } from '../components/Page';

export function KairosChatPage() {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    // Dynamically insert the style tag if not already loaded
    if (!document.getElementById('rpm-prototype-styles')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'rpm-prototype-styles';
      fetch('/src/rpm-prototype.css')
        .then((res) => res.text())
        .then((css) => {
          styleEl.textContent = css;
          document.head.appendChild(styleEl);
        })
        .catch(console.error);
    }

    // Load markup and execute the interactive engine script
    let isCancelled = false;

    Promise.all([
      fetch('/src/rpm-markup.html').then((r) => r.text()),
      fetch('/src/rpm-engine.js').then((r) => r.text()),
    ])
      .then(([markup, scriptText]) => {
        if (isCancelled || !containerRef.current) return;
        containerRef.current.innerHTML = markup;

        // Evaluate the engine in the global scope so DOM event handlers work seamlessly
        const scriptEl = document.createElement('script');
        scriptEl.id = 'rpm-prototype-script';
        scriptEl.textContent = `(function() {
          ${scriptText}
        })();`;
        document.body.appendChild(scriptEl);
      })
      .catch(console.error);

    return () => {
      isCancelled = true;
      const script = document.getElementById('rpm-prototype-script');
      if (script) script.remove();
    };
  }, []);

  return (
    <Page title="KAIROS Chat Experience — RPM Remodel Copilot" titleVisuallyHidden>
      <div
        ref={containerRef}
        style={{
          minHeight: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '16px 0',
        }}
      />
    </Page>
  );
}
