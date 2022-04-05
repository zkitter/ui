/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.{ts,tsx}'],
  coverageDirectory: 'coverage',
  testPathIgnorePatterns: [
      '/node_modules/',
      '/build/',
      '/build-test/',
      '/static/',
      '/src/util/message.ts',
      '/src/util/svc.ts',
  ],
  roots: ['<rootDir>/src'],
  verbose: true,
  moduleNameMapper: {
    "\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$": "<rootDir>/__mocks__/fileMock.js",
    "\\.(css|less|scss)$": "<rootDir>/__mocks__/styleMock.js",
  },
  "setupFiles": [
    "fake-indexeddb/auto"
  ],
  testEnvironmentOptions: {
    html: `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link rel="manifest" href="/manifest.json">
          <meta name="theme-color" content="white"/>
          <link rel="preconnect" href="https://fonts.gstatic.com">
          <link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;600;700&family=Roboto+Mono:wght@300;400;600;700&family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet">
          <link href="https://unpkg.com/tailwindcss@2.2.11/dist/tailwind.min.css" rel="stylesheet">
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css" integrity="sha512-iBBXm8fW90+nuLcSKlbmrPcLa0OT92xO1BIsZ+ywDWZCvqsWgccV3gFoRBv0z+8dLJgyAHIhR35VZc2oM/gI1w==" crossorigin="anonymous" />
          <link rel="icon" type="image/svg+xml" href="/favicon.png">
          <title>Auti.sm</title>
      </head>
      <body>
      <script>
          global = globalThis //<- this should be enough
      </script>
      <div id="root"></div>
      <div id="modal-root"></div>
      </body>
      </html>
    `,
  },
  coverageThreshold: {
    global: {
      lines: 50,
    }
  }
};