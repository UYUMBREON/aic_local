/** @jsxImportSource @emotion/react */
import { Box, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import StyledPanelistAvatar from './StyledPanelistAvatar';

const fontColor = "#ffffff";

/**
 * チャット画面用アバター表示のプロパティの型
 * @typedef {Object} StyledPanelistsDisplayProps
 * @property {Object[]} configList - 設定リスト
 * @property {number} configId - 設定ファイルID
 * @property {boolean} [isToEnglish=false] - 英語化フラグ
 */

/**
 * チャット画面用アバター表示 \
 * 与えられた設定ファイルの情報に基づき、議論に参加しているパネリストの情報を表示する。 \
 * パネリストの情報は、アバター画像とパネリスト名を表示する。
 * @function StyledPanelistsDisplay
 * @param {StyledPanelistsDisplayProps} props - プロパティ 
 * @returns {JSX.Element} アバター表示コンポーネント
 */
export default function StyledPanelistsDisplay({configList, configId, isToEnglish = false}) {
  // 表示するアバターの一覧 [{ name: 'hoge', image: 'hoge.png'}]
  const [avatarList, setAvatarList] = useState([]);

  useEffect(() => {
    // 設定ファイル引き当て
    const config = configList.find(c => c.id == configId);
    if (config) {
      // パネリスト名/アバターファイル名を取得
      const panelistNames = config.panelist_names[isToEnglish ? 'en' : 'ja'];
      const panelistImages = config.panelist_images[isToEnglish ? 'en' : 'ja'];
      // パネリスト名/アバターファイル名を整形
      setAvatarList(panelistNames.map(name => {
        const image = (name in panelistImages) ? panelistImages[name] : '';
        return { name: name, image: image };
      }));
    } else {
      setAvatarList([]);
    }
  }, [configList, configId, isToEnglish]);

  /* コンポーネント本体 */
  return (
    <Box display='flex' justifyContent='center' alignItems='start' sx={{ m: 'auto' }}>
      {avatarList.map((avatar, index) => (
        <Box key={index} display='flex' flexDirection='column' alignItems='center' sx={{ width: '12vw', maxWidth: '12vw' }}>
          {/* アバター */}
          <StyledPanelistAvatar
            alt={avatar.name}
            src={avatar.image}
            sx={{ width: 100, height: 100 }}
            variant='square'
          />
          {/* 名前 */}
          <Typography
            variant={'body1'}
            fontSize={'20px'}
            textAlign={'center'}
            zIndex={1}
            sx={{ color: fontColor }}
          >
            {avatar.name}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};
