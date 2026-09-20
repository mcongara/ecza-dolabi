import type { Metadata } from 'next';
import './globals.css';
import {InventoryProvider} from './components/inventory-provider';
export const metadata: Metadata = { title: 'ecza dolabı · Evdeki ilaçlarını düzenle', description: 'Evde biriken ilaçlarını listele, türlerini ve son kullanma tarihlerini gözden geçir, ayıracaklarını tek yerde gör.' };
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) { return <html lang="tr"><body><InventoryProvider>{children}</InventoryProvider></body></html>; }
