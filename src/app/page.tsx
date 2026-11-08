import { redirect } from 'next/navigation'

// The ÉLAN fashion store is a static site (HTML/CSS/vanilla JS)
// served from /public/site/. Root route forwards straight to it.
export default function Home() {
  redirect('/site/index.html')
}
