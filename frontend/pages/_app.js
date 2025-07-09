import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from '../themes/theme';


/**
 * アプリケーション全体のコンポーネントのプロパティ
 * @typedef {Object} AppProps
 * @property {JSX.Element} Component - 呼び出されるコンポーネント
 * @property {Object} pageProps - コンポーネントに渡されるプロパティ
 */

/**
 * アプリケーション全体のコンポーネント \
 * 画面全体に渡るスタイルやテーマの適用など、アプリケーション全体に渡る設定を行う。
 * @function App
 * @param {AppProps} props - プロパティ
 * @returns {JSX.Element} アプリケーション全体を表すコンポーネント
 */
export default function App({ Component, pageProps }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Component {...pageProps} />
    </ThemeProvider>
  )
}