import { useRouter } from "next/router"
import { useEffect } from "react";
import { Box, Typography } from "@mui/material"

/**
 * 初期画面 \
 * Next.jsにアクセスした時に最初に表示される画面。 \
 * ルーム設定画面(閲覧者ユーザ用)に自動遷移する。
 * @function Home
 * @returns {JSX.Element} 初期画面のコンポーネント
 */
export default function Home() {
  const router = useRouter();
  useEffect(() => {
    router.push("/view");
  },[]);
  return (
    <Box
      display={'flex'}
      justifyContent={'center'}
      alignItems={'center'}
      height={'100vh'}
    >
      <Typography>Now loading...</Typography>
    </Box>
  );
}
