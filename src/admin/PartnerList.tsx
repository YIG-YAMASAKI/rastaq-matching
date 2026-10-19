import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge, EmptyState, LevelBadge, LevelMeter, RegStatusBadge } from '../components/ui';
import { NATIONWIDE, REGIONS } from '../data/geo';
import { WORK_TYPES } from '../data/master';
import { areaMatches, fmtAreas } from '../lib';
import { useStore } from '../store/AppStore';
import type { RegistrationStatus } from '../types';
import { PageHeader } from './AdminLayout';

const REG: RegistrationStatus[] = ['承認済み', '審査中', '差し戻し', '利用停止'];

export function PartnerList() {
  const { state } = useStore();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [reg, setReg] = useState('');
  const [area, setArea] = useState('');
  const [workType, setWorkType] = useState('');
  const [minLevel, setMinLevel] = useState(0);

  const rows = useMemo(() => {
    const kw = q.trim();
    return state.partners.filter(
      (p) =>
        (!reg || p.registrationStatus === reg) &&
        (!area || (area === NATIONWIDE ? p.areas.includes(NATIONWIDE) : areaMatches(area, p.areas))) &&
        (!workType || p.workTypes.includes(workType)) &&
        p.skillLevel >= minLevel &&
        (!kw || [p.companyName, p.contactName, p.address, p.email].some((t) => t.includes(kw))),
    );
  }, [state.partners, q, reg, area, workType, minLevel]);

  const stat = (p: string) => state.applications.filter((a) => a.partnerId === p);

  return (
    <>
      <PageHeader title="協力業者管理" sub={`登録業者 ${state.partners.length}社`} />
      <div className="card">
        <div className="filters">
          <div className="search">
            <span className="search-icon">⌕</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="会社名・担当者・住所で検索" />
          </div>
          <select value={reg} onChange={(e) => setReg(e.target.value)}>
            <option value="">登録ステータス：すべて</option>
            {REG.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
          <select value={area} onChange={(e) => setArea(e.target.value)}>
            <option value="">対応エリア：すべて</option>
            <option value={NATIONWIDE}>全国対応の業者</option>
            {REGIONS.map((r) => (
              <optgroup key={r.name} label={r.name}>
                {r.prefectures.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </optgroup>
            ))}
          </select>
          <select value={workType} onChange={(e) => setWorkType(e.target.value)}>
            <option value="">工種：すべて</option>
            {WORK_TYPES.map((w) => (
              <option key={w}>{w}</option>
            ))}
          </select>
          <select value={minLevel} onChange={(e) => setMinLevel(Number(e.target.value))}>
            <option value={0}>熟練度：すべて</option>
            {[2, 3, 4, 5].map((l) => (
              <option key={l} value={l}>
                Lv.{l}以上
              </option>
            ))}
          </select>
          <div className="filters-count">{rows.length}社</div>
        </div>
        {rows.length === 0 ? (
          <EmptyState icon="🔍" title="条件に一致する協力業者はいません" />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>会社名 / 担当者</th>
                  <th>連絡先</th>
                  <th>対応エリア</th>
                  <th>対応工種</th>
                  <th>熟練度</th>
                  <th className="num">応募 / 決定</th>
                  <th>契約</th>
                  <th>登録ステータス</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const apps = stat(p.id);
                  return (
                    <tr key={p.id} className="clickable" onClick={() => navigate(`/admin/partners/${p.id}`)}>
                      <td>
                        <Link to={`/admin/partners/${p.id}`} className="cell-link" onClick={(e) => e.stopPropagation()}>
                          {p.companyName}
                        </Link>
                        <div className="cell-sub">{p.contactName}</div>
                      </td>
                      <td className="small">
                        {p.phone}
                        <div className="cell-sub">{p.email}</div>
                      </td>
                      <td className="small">{fmtAreas(p.areas)}</td>
                      <td>
                        <div className="tags">
                          {p.workTypes.slice(0, 3).map((w) => (
                            <span key={w} className="tag">
                              {w}
                            </span>
                          ))}
                          {p.workTypes.length > 3 && <span className="tag">+{p.workTypes.length - 3}</span>}
                        </div>
                      </td>
                      <td className="nowrap">
                        <LevelBadge level={p.skillLevel} /> <LevelMeter level={p.skillLevel} />
                        <div className="cell-sub">経験{p.experienceYears}年</div>
                      </td>
                      <td className="num">
                        {apps.filter((a) => a.status !== '辞退').length} / {apps.filter((a) => a.status === '決定').length}
                      </td>
                      <td>
                        <Badge tone={p.contractStatus === '契約済み' ? 'navy' : 'gray'}>{p.contractStatus}</Badge>
                      </td>
                      <td>
                        <RegStatusBadge status={p.registrationStatus} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
