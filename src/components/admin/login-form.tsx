"use client";

import { useState } from "react";
import Link from "next/link";
import { LoaderCircle, LogIn, ShieldCheck } from "lucide-react";
import { adminApi, describeError } from "./admin-api";

export function LoginForm({ onSignedIn }: { onSignedIn: (username: string) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const identity = await adminApi.login(username, password);
      setPassword("");
      onSignedIn(identity.username);
    } catch (loginError) {
      setError(describeError(loginError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="ac-login">
      <form className="ac-login__card" onSubmit={submit}>
        <div className="ac-login__brand">
          <Link href="/">XMHUA</Link>
          <span>内容后台</span>
        </div>
        <h1>登录</h1>
        <p>用你的后台账号登录，之后就能直接增删改站点上的所有内容。</p>
        <label>用户名
          <input autoComplete="username" value={username} onChange={event => setUsername(event.target.value)}
            required autoFocus />
        </label>
        <label>密码
          <input type="password" autoComplete="current-password" value={password}
            onChange={event => setPassword(event.target.value)} required />
        </label>
        <button type="submit" className="ac-button ac-button--primary" disabled={busy}>
          {busy ? <LoaderCircle className="ac-spin" size={16} /> : <LogIn size={16} />}登录
        </button>
        {error && <p className="ac-notice ac-notice--error" role="alert">{error}</p>}
        <p className="ac-login__note">
          <ShieldCheck size={14} />
          密码只在服务端校验，浏览器里保存的是一个仅服务端可读的会话凭证。
        </p>
      </form>
    </main>
  );
}
