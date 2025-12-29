import WelcomeClient from './welcome-client'

interface PageProps {
  params: {
    slug: string
  }
}

export default function WelcomePage({ params }: PageProps) {
  const { slug } = params

  // Middleware ensures only legends-restaurant reaches here
  // No DB validation needed
  return <WelcomeClient slug={slug} />
}
