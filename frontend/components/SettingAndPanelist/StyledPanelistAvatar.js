import { Avatar } from '@mui/material';
import { createTheme, ThemeProvider  } from '@mui/material/styles';

/**
 * カスタムテーマ(パネリストアバター用) \
 * 枠内に収まるようにアバター画像を表示するように設定されている。
 */
const theme = createTheme({
    components: {
        MuiAvatar : {
            styleOverrides: {
                img: {
                    objectFit : 'contain',
                }
            },
        },
    },
  })

/**
 * パネリストアバター \
 * パネリストのアバター画像を適切に表示するため、カスタムテーマを適用して表示する。
 * @function StyledPanelistAvatar
 * @param {Object} props - プロパティ
 * @returns {JSX.Element} パネリストを表示するアバターのコンポーネント
 */
export default function StyledPanelistAvatar(props) {
    // Avatarのobject-fitの上書きはテーマで行う必要があるのでThemeProviderを設定
    return (
        <ThemeProvider theme={theme} >
            <Avatar {...props} />
        </ThemeProvider>
    )
} 