import Link from "next/link";
import { redirect } from "next/navigation";

export default function Home() {
  // Redirect to projects page
  redirect("/projects");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">ERDwithAI v5.1</h1>
            <p className="text-xl mt-2">AI-Powered ERD Design Platform</p>
          </div>
          <Link
            href="/projects"
            className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-lg font-semibold text-primary-foreground hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl"
          >
            Open Projects →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <Link
            href="/designer"
            className="border p-6 rounded-lg hover:border-primary hover:shadow-lg transition-all cursor-pointer"
          >
            <h2 className="text-2xl font-bold mb-2">Visual ERD Designer ✨</h2>
            <p>
              Create and edit Entity-Relationship diagrams with visual tools
            </p>
            <p className="text-sm text-blue-600 mt-2">→ Open Designer</p>
          </Link>

          <div className="border p-6 rounded-lg">
            <h2 className="text-2xl font-bold mb-2">Natural Language Design</h2>
            <p>Describe your domain in plain English, AI creates the ERD</p>
          </div>

          <div className="border p-6 rounded-lg">
            <h2 className="text-2xl font-bold mb-2">Human-in-the-Loop</h2>
            <p>Review and approve every entity and relationship</p>
          </div>

          <div className="border p-6 rounded-lg">
            <h2 className="text-2xl font-bold mb-2">Multi-Stack Generation</h2>
            <p>Generate Next.js, NestJS, OData V4, OpenUI5</p>
          </div>

          <div className="border p-6 rounded-lg">
            <h2 className="text-2xl font-bold mb-2">Template-Driven</h2>
            <p>All code from customizable Handlebars templates</p>
          </div>

          <div className="border p-6 rounded-lg">
            <h2 className="text-2xl font-bold mb-2">Database Connection</h2>
            <p>Connect to PostgreSQL, MySQL, SQLite, and inspect schemas</p>
          </div>
        </div>

        <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-950 rounded-lg">
          <h3 className="text-xl font-bold mb-2">Quick Start</h3>
          <code className="block bg-gray-800 text-white p-4 rounded">
            erdwithai-convert "Blog with users and posts" -o blog.mermaid
          </code>
        </div>
      </div>
    </main>
  );
}
