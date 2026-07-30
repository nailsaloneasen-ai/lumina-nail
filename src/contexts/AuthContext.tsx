import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import {
  getLoginIdMeta,
  isKnownLoginId,
  loginIdToEmail,
  type LoginId,
} from '../lib/authMapping';
import type { AppUser } from '../types';

interface AuthContextValue {
  /** 現在ログイン中のユーザー。未ログインならnull */
  user: AppUser | null;
  /** 初回のログイン状態確認中(true の間はローディング表示をする) */
  isLoading: boolean;
  /** ID/PWでログインする。失敗時はErrorをthrowする */
  login: (loginId: string, password: string) => Promise<void>;
  /** ログアウトする */
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Firebase UserオブジェクトからアプリのAppUser情報を組み立てる。
 * ログインIDはメールアドレスの@より前の部分から復元する。
 */
function buildAppUser(email: string | null, uid: string): AppUser | null {
  if (!email) return null;
  const localPart = email.split('@')[0];
  if (!isKnownLoginId(localPart)) return null;

  const meta = getLoginIdMeta(localPart);
  return {
    uid,
    loginId: localPart,
    displayName: meta.displayName,
    role: meta.role,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // ログイン状態はログアウトするまで保持する要件のため、ローカル永続化を明示的に指定
    setPersistence(auth, browserLocalPersistence).catch((error) => {
      console.error('永続化設定に失敗しました', error);
    });

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(buildAppUser(firebaseUser.email, firebaseUser.uid));
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  async function login(loginId: string, password: string) {
    const normalizedId = loginId.trim().toLowerCase();

    if (!isKnownLoginId(normalizedId)) {
      throw new Error('IDまたはパスワードが正しくありません');
    }

    try {
      await signInWithEmailAndPassword(
        auth,
        loginIdToEmail(normalizedId as LoginId),
        password,
      );
    } catch {
      // Firebase側の詳細なエラーコードはユーザーに見せず、共通メッセージにする
      throw new Error('IDまたはパスワードが正しくありません');
    }
  }

  async function logout() {
    await firebaseSignOut(auth);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

/** 認証状態にアクセスするためのフック。AuthProviderの内側でのみ使用可能。 */
// eslint-disable-next-line react-refresh/only-export-components -- Provider定義と同一ファイルに置く一般的なパターン
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthはAuthProviderの内側で使用してください');
  }
  return context;
}
