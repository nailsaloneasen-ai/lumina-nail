/**
 * 初回のログイン状態確認中に表示するローディング画面。
 * Firebase Authenticationがローカルの認証状態を復元するまでの一瞬だけ表示される。
 */
export default function LoadingScreen() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6">
      <div
        className="h-10 w-10 rounded-full border-2 border-lumina-blush border-t-lumina-pink-deep animate-spin"
        role="status"
        aria-label="読み込み中"
      />
    </div>
  );
}
