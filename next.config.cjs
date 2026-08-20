const isProd = process.env.NODE_ENV === 'production';

const runtimeCaching = [
  {
    urlPattern: /\/_next\//,
    handler: 'StaleWhileRevalidate',
    options: {
      cacheName: 'static-resources',
    },
  },
  {
    urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif|ico)$/,
    handler: 'CacheFirst',
    options: {
      cacheName: 'images',
    },
  },
  {
    urlPattern: /.*/,
    handler: 'NetworkFirst',
    options: {
      cacheName: 'pages',
    },
  },
];

const baseConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [],
  },
};

if (isProd) {
  // Require next-pwa only in production so dev servers are not affected.
  const withPWA = require('next-pwa')({
    dest: 'public',
    runtimeCaching,
    buildExcludes: [/middleware-manifest\.json$/],
  });

  module.exports = withPWA({
    ...baseConfig,
    // keep pwa plugin active only in production
    pwa: {
      dest: 'public',
      disable: false,
    },
  });
} else {
  module.exports = baseConfig;
}
