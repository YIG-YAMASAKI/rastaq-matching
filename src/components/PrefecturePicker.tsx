import { NATIONWIDE, REGIONS } from '../data/geo';

/**
 * 対応エリア（都道府県・複数選択）。
 * 地方ごとにまとめて表示し、「まとめて選択」は入力の補助。保存されるのは都道府県（または「全国」）のみ。
 */
export function PrefecturePicker({
  value,
  onChange,
  legacyAreas = [],
  mobile,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  legacyAreas?: string[];
  mobile?: boolean;
}) {
  const toggle = (p: string) => onChange(value.includes(p) ? value.filter((v) => v !== p) : [...value, p]);
  const toggleRegion = (prefs: string[], all: boolean) =>
    onChange(all ? value.filter((v) => !prefs.includes(v)) : [...value, ...prefs.filter((p) => !value.includes(p))]);
  const nationwide = value.includes(NATIONWIDE);

  return (
    <div className="pref-picker">
      {legacyAreas.length > 0 && (
        <div className="notice notice-warning small">
          旧仕様の対応エリア「{legacyAreas.join('・')}」は都道府県に移行できませんでした。該当する都道府県を選び直してください（保存するとこの表示は消えます）。
        </div>
      )}
      <label className={`check-item pref-nationwide ${nationwide ? 'checked' : ''}`}>
        <input type="checkbox" checked={nationwide} onChange={() => toggle(NATIONWIDE)} />
        <span>
          全国<small>（すべての都道府県の案件に対応）</small>
        </span>
      </label>
      {REGIONS.map((r) => {
        const count = r.prefectures.filter((p) => value.includes(p)).length;
        const all = count === r.prefectures.length;
        return (
          <details key={r.name} className="pref-region" open={count > 0 || (!mobile && value.length === 0 && r.name === '関東')}>
            <summary>
              <span className="pref-region-name">{r.name}</span>
              {count > 0 && <span className="pref-region-count">{count}/{r.prefectures.length}</span>}
            </summary>
            <div className="pref-region-body">
              {r.prefectures.length > 1 && (
                <button type="button" className="link-btn small" onClick={() => toggleRegion(r.prefectures, all)}>
                  {all ? `${r.name}の選択を解除` : `${r.name}をまとめて選択`}
                </button>
              )}
              <div className="check-group" style={{ ['--cols' as string]: mobile ? 2 : 4 }}>
                {r.prefectures.map((p) => (
                  <label key={p} className={`check-item ${value.includes(p) ? 'checked' : ''}`}>
                    <input type="checkbox" checked={value.includes(p)} onChange={() => toggle(p)} />
                    <span>{p}</span>
                  </label>
                ))}
              </div>
            </div>
          </details>
        );
      })}
    </div>
  );
}
