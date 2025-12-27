import { AdminAuthWrapper } from './auth-wrapper'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AdminAuthWrapper>{children}</AdminAuthWrapper>
}

