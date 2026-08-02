import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pagesはリポジトリ名のサブパス(例: https://ユーザー名.github.io/lumina-nail/)
// で公開されるため、リポジトリ名が "lumina-nail" 以外の場合はこの値も
// 同じ名前に書き換えること(例: "my-salon-app" なら '/my-salon-app/')。
const REPO_BASE_PATH = '/lumina-nail/';

// https://vite.dev/config/
export default defineConfig({
  base: REPO_BASE_PATH,
  plugins: [
    react(),
    VitePWA({
      // Service Workerを自動更新する(新バージョン公開時にリロードで反映される)
      registerType: 'autoUpdate',

      // アプリの見た目(ホーム画面追加時のアイコン・名称・色)
      manifest: {
        name: "S'Argent",
        short_name: "S'Argent",
        description: 'ネイルサロン向け予約・会計管理アプリ',
        lang: 'ja',
        start_url: REPO_BASE_PATH,
        scope: REPO_BASE_PATH,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#fef0f6',
        theme_color: '#d9709a',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },

      // オフライン時にアプリ本体(HTML/CSS/JS/アイコン)を表示できるようキャッシュする。
      // Firestoreのデータ自体はsrc/lib/firebase.tsのpersistentLocalCacheでオフライン閲覧に対応済み。
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
        // Firestore/Firebase AuthへのAPI通信はキャッシュ対象外(常に最新の通信を試みる)
        navigateFallbackDenylist: [/^\/__/],
      },

      devOptions: {
        // 開発中(npm run dev)もPWAの挙動を確認できるようにする
        enabled: true,
      },
    }),
  ],
});

