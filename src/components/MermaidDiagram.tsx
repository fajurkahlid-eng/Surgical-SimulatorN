import { useLayoutEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    primaryColor: '#0d9488',
    primaryTextColor: '#ccfbf1',
    primaryBorderColor: '#14b8a6',
    lineColor: '#5eead4',
    secondaryColor: '#134e4a',
    tertiaryColor: '#0f766e',
  },
});

interface MermaidDiagramProps {
  chart: string;
  id?: string;
}

export default function MermaidDiagram({ chart, id = 'mermaid-diagram' }: MermaidDiagramProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(`mermaid-${id}-${Math.random().toString(36).slice(2)}`);
  const [error, setError] = useState<string | null>(null);

  useLayoutEffect(() => {
    if (!containerRef.current || !chart) return;
    let active = true;
    setError(null);
    const uid = idRef.current;
    mermaid
      .render(uid, chart)
      .then(({ svg }) => {
        if (active && containerRef.current) containerRef.current.innerHTML = svg;
      })
      .catch((err) => {
        setError(err?.message ?? 'Mermaid render failed');
      });
    return () => {
      active = false;
    };
  }, [chart, id]);

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/50 bg-red-950/30 p-4 text-red-300 text-sm">
        Diagram error: {error}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="mermaid-container rounded-xl border border-teal-700/60 bg-teal-900/30 p-4 overflow-x-auto flex justify-center min-h-[200px]"
    />
  );
}
