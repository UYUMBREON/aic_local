import Image from 'next/image';

/**
 * 吹き出し \
 * 現在発言しているパネリストを示すためのもの。
 * @function SpeechBubble
 * @returns {JSX.Element} 吹き出しのコンポーネント
 */
export default function SpeechBubble() {
  return (
    <Image src="/images/fukidashi.png" width={90} height={70} alt={"Speaking"}/>
  );
};