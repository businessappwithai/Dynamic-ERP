/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimize package transpilation for Bun.js runtime
  transpilePackages: [
    "@erdwithai/core",
    "@erdwithai/ai",
    "@erdwithai/generator",
  ],

  // Output configuration for standalone deployment
  output: "standalone",

  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // SWC minification for faster builds
  swcMinify: true,

  // Experimental features
  experimental: {
    // Server components external packages
    serverComponentsExternalPackages: [
      "@mastra/core",
      "handlebars",
      "better-sqlite3",
      "libsql",
      "@libsql/client",
      "@libsql/hrana-client",
      "@mastra/libsql",
      "@e2b/code-interpreter",
      "onnxruntime-node",
      "fastembed",
      "@mastra/fastembed",
      "knex",
      "pg",
      "sqlite3",
      "sqlite",
    ],
    // Optimize CSS loading
    optimizeCss: true,
    // Optimize package imports
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-select",
    ],
  },

  // Webpack configuration for better compatibility
  webpack: (config, { isServer }) => {
    // Extension alias for better module resolution
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js", ".jsx"],
    };

    // Add SVG support
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });

    // Optimize for Bun.js
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    } else {
      config.externals = [
        ...(config.externals || []),
        "@mastra/core",
        "libsql",
        "@libsql/client",
        "@libsql/hrana-client",
        "onnxruntime-node",
        "fastembed",
        "@mastra/fastembed",
        "knex",
        "pg",
        "better-sqlite3",
        "sqlite3",
        "sqlite",
      ];
    }

    return config;
  },

  // Image optimization domains
  images: {
    domains: [],
    unoptimized: false,
    formats: ["image/webp", "image/avif"],
  },

  // Headers for security and caching
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
        ],
      },
    ];
  },

  // Redirects for legacy routes
  async redirects() {
    return [
      {
        source: "/",
        destination: "/projects",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
