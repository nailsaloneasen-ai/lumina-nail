/**
 * 予約通知(メール送信)の接続設定
 * -----------------------------------------------------------------------
 * WEBAPP_URLは、Google Apps Scriptのウェブアプリを公開した後に発行される
 * URLを設定する(未設定の間は通知機能自体が動かない)。
 * SECRETは、Apps Script側のコードに埋め込んだ値と必ず同じにする。
 * どちらか一方だけを書き換えると通知が届かなくなるので注意。
 * -----------------------------------------------------------------------
 */

/** Google Apps ScriptのウェブアプリURL(公開後にここへ貼り付ける) */
export const NOTIFY_WEBAPP_URL =
  'https://script.google.com/macros/s/AKfycbxcAc-kCW-SvwaXtxfPNxyxxk-525H-R7FIwwilxXFXD2peFoYqojDRh9PKSO0GDhRXzg/exec';

/** Apps Script側のSECRETと同じ値にすること */
export const NOTIFY_SECRET = '88f1d7b8c7cdb47d477894f071d16c531a3c7c0870a6da3e';
