import { Icon as IconifyIcon } from '@iconify/react';
import { addCollection } from '@iconify/react';
import materialSymbols from '@iconify-json/material-symbols/icons.json';
import mdi from '@iconify-json/mdi/icons.json';
import heroicons from '@iconify-json/heroicons/icons.json';

// 注册离线图标集，避免网络请求
addCollection(materialSymbols as any);
addCollection(mdi as any);
addCollection(heroicons as any);

interface IconProps {
  icon: string;
  className?: string;
  style?: React.CSSProperties;
}

const Icon = ({ icon, className = '', style }: IconProps) => {
  return <IconifyIcon icon={icon} className={className} style={style} />;
};

export default Icon;



