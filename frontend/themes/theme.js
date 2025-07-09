import { createTheme } from '@mui/material'

/**
 * 初期テーマ \
 * スクロールバーのデザインなど、画面全体に適用するスタイルを定義する。 \
 * 個々のコンポーネントにおける細かいスタイルの調整は、それぞれのコンポーネントで行っている。
 * @type {Object}
 */
const defaultTheme = createTheme({
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        'body::-webkit-scrollbar': {
          width: '10px',
          height: '10px'
        },
        '::-webkit-scrollbar': {
          width: '8px',
          height: '8px'
        },
        '::-webkit-scrollbar-track': {
          background: "#555555",
        },
        '::-webkit-scrollbar-thumb': {
          background: "#EEEEEE",
          borderRadius: '5px'
        }
      },
    },
  },
});

export default defaultTheme
