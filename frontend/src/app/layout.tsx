import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/contexts/ThemeContext';
import LayoutWrapper from '@/components/LayoutWrapper';

export const metadata: Metadata = {
  title: '简历筛选系统',
  description: 'AI驱动的简历筛选与候选人管理系统',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider>
          <LayoutWrapper>{children}</LayoutWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}
