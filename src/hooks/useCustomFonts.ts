import { useEffect, useState, useCallback } from 'react';

const flaskAPI = import.meta.env.VITE_FLASK_API || "http://localhost:5000";

export interface CustomFont {
  id: number;
  name: string;
  filename: string;
}

export function getFontStylesCss(fonts: CustomFont[]): string {
  let css = '';
  fonts.forEach(font => {
    const fontUrl = `${flaskAPI}/static/fonts/${font.filename}`;
    css += `
@font-face {
  font-family: '${font.name}';
  src: url('${fontUrl}');
}
`;
  });
  return css;
}

export function useCustomFonts() {
  const [fonts, setFonts] = useState<CustomFont[]>([]);
  const [cssString, setCssString] = useState<string>('');

  const refreshFonts = useCallback(async () => {
    try {
      const res = await fetch(`${flaskAPI}/api/fonts`);
      if (!res.ok) throw new Error("Failed to fetch fonts");
      const data = await res.json();
      if (Array.isArray(data)) {
        setFonts(data);
        const css = getFontStylesCss(data);
        setCssString(css);

        // Inject/update in main document head
        let styleEl = document.getElementById('custom-fonts-style');
        if (!styleEl) {
          styleEl = document.createElement('style');
          styleEl.id = 'custom-fonts-style';
          document.head.appendChild(styleEl);
        }
        styleEl.innerHTML = css;
      }
    } catch (err) {
      console.error("Error loading custom fonts:", err);
    }
  }, []);

  useEffect(() => {
    refreshFonts();
  }, [refreshFonts]);

  return { fonts, cssString, refreshFonts };
}
