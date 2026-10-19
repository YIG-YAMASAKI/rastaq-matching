import { Link, Outlet, useLocation } from 'react-router-dom';
import { useCurrentPartner } from '../store/AppStore';

/**
 * PCで見たときにスマホ画面を端末枠で表示する（デモ用）。
 * 実際のスマホ幅では枠なしの全画面表示になる。
 */
export function PhoneFrame() {
  const partner = useCurrentPartner();
  const { pathname } = useLocation();
  const isRegister = pathname.startsWith('/register');

  return (
    <div className="phone-stage">
      <aside className="phone-guide">
        <h2>{isRegister ? '新規協力業者登録フォーム' : '協力業者スマホ画面'}</h2>
        {isRegister ? (
          <>
            <p>ログイン不要でアクセスできる登録フォームです。URLやQRコードから開く想定です。</p>
            <div className="qr-box">
              <div className="qr" aria-hidden>
                {Array.from({ length: 49 }).map((_, i) => (
                  <span key={i} className={(i * 7 + (i % 5) * 3) % 3 === 0 || [0, 1, 7, 8, 5, 6, 12, 13, 35, 36, 42, 43].includes(i) ? 'on' : ''} />
                ))}
              </div>
              <div className="small muted">QRコード（イメージ）<br />…/#/register</div>
            </div>
            <ol>
              <li>必須項目を入力して送信</li>
              <li>受付完了画面が表示されます</li>
              <li>
                <Link to="/admin/reviews">管理画面の「新規登録審査」</Link>に反映されます
              </li>
            </ol>
          </>
        ) : (
          <>
            <p>
              ログイン中：<strong>{partner.companyName}</strong>
              <br />
              <span className="small muted">上部のバーでログイン業者を切り替えられます</span>
            </p>
            <h3>デモ操作の流れ</h3>
            <ol>
              <li>
                <Link to="/admin/projects/new">管理画面で案件を登録</Link>し、募集開始
              </li>
              <li>このスマホ画面の「新着」に案件が届きます</li>
              <li>案件を開いて「応募する」</li>
              <li>管理画面の案件詳細で締め切り → 選定 → 確定・通知</li>
              <li>スマホ画面に「決定／見送り」が反映されます</li>
              <li>チャットは双方向で共有されます</li>
            </ol>
          </>
        )}
      </aside>
      <div className="phone">
        <div className="phone-notch" />
        <div className="phone-screen">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
