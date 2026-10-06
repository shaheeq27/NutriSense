import { THEME_STORAGE_KEY } from "@/stores/ui-store"

/** Inline script that applies the theme before first paint to avoid a flash. */
export default function ThemeScript() {
  const code = `(function(){try{var p="system";var raw=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(raw){var s=JSON.parse(raw);if(s&&s.state&&s.state.theme)p=s.state.theme;}var d=p==="dark"||(p==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light";}catch(e){}})();`
  return <script dangerouslySetInnerHTML={{ __html: code }} />
}
