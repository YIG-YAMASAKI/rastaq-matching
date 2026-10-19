/**
 * エリア（都道府県）と、距離計算用の住所・座標マスター。
 * 外部の地図API・ジオコーディングAPIは使わず、デモ用に用意した「住所 → 座標」の対応表だけで判定する。
 */

export interface LatLng {
  lat: number;
  lng: number;
}

/** 対応エリアで「すべての都道府県に対応」を表す値 */
export const NATIONWIDE = '全国';

/** 都道府県（地方ごと。地方は入力をまとめて行うための補助で、判定には使わない） */
export const REGIONS: { name: string; prefectures: string[] }[] = [
  { name: '北海道', prefectures: ['北海道'] },
  { name: '東北', prefectures: ['青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県'] },
  { name: '関東', prefectures: ['茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県'] },
  { name: '中部', prefectures: ['新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県', '静岡県', '愛知県'] },
  { name: '近畿', prefectures: ['三重県', '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県'] },
  { name: '中国', prefectures: ['鳥取県', '島根県', '岡山県', '広島県', '山口県'] },
  { name: '四国', prefectures: ['徳島県', '香川県', '愛媛県', '高知県'] },
  { name: '九州・沖縄', prefectures: ['福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'] },
];

export const PREFECTURES = REGIONS.flatMap((r) => r.prefectures);

/**
 * 旧仕様（地方区分）の対応エリア → 都道府県。
 * どの定義でも含まれる都道府県だけを対象にする（例：近畿は三重県を含めない）。
 * 「中部（北部）」など範囲が定まらない区分と「その他」は移行せず、要再設定として残す。
 */
export const LEGACY_AREA_MAP: Record<string, string[]> = {
  北海道: ['北海道'],
  東北: ['青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県'],
  関東: ['茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県'],
  近畿: ['滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県'],
  中国: ['鳥取県', '島根県', '岡山県', '広島県', '山口県'],
  四国: ['徳島県', '香川県', '愛媛県', '高知県'],
  九州: ['福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県'],
  沖縄: ['沖縄県'],
};

/** RASTAQ 東京オフィス（「RASTAQ 東京オフィスに集合」の案件で距離の終点にする） */
export const RASTAQ_OFFICE = {
  name: 'RASTAQ 東京オフィス',
  zip: '144-0055',
  address: '東京都大田区仲六郷1-20-6',
  // デモ用の代表座標（測量値ではない）
  point: { lat: 35.547, lng: 139.712 } as LatLng,
};

/**
 * デモ用の「住所 → 座標」対応表。
 * 座標はデモ用の代表座標で、実際の測量・ジオコーディング結果ではない。
 * ここに無い住所は座標なし（距離不明）として扱い、推測した座標は使わない。
 * TODO(本番): 住所ジオコーディングAPIで座標を取得し、案件・業者データに保存する
 */
export const DEMO_COORDS: { address: string; point: LatLng; note: string }[] = [
  // 協力業者の所在地（初期データ）
  { address: '東京都港区芝公園2-4-1', point: { lat: 35.655, lng: 139.749 }, note: '協力業者' },
  { address: '東京都新宿区西新宿7-10-3', point: { lat: 35.696, lng: 139.697 }, note: '協力業者' },
  { address: '東京都江東区東陽4-1-13', point: { lat: 35.671, lng: 139.816 }, note: '協力業者' },
  { address: '東京都品川区大崎2-9-3', point: { lat: 35.62, lng: 139.73 }, note: '協力業者' },
  { address: '東京都大田区蒲田5-37-1', point: { lat: 35.563, lng: 139.718 }, note: '協力業者' },
  { address: '東京都立川市曙町2-8-18', point: { lat: 35.7, lng: 139.415 }, note: '協力業者' },
  { address: '神奈川県横浜市中区山下町1-1', point: { lat: 35.446, lng: 139.649 }, note: '協力業者' },
  { address: '埼玉県さいたま市大宮区桜木町1-7-5', point: { lat: 35.906, lng: 139.623 }, note: '協力業者' },
  { address: '東京都墨田区錦糸1-2-1', point: { lat: 35.698, lng: 139.814 }, note: '協力業者' },
  // 案件の作業場所（初期データ）
  { address: '東京都港区虎ノ門3-8-21', point: { lat: 35.665, lng: 139.745 }, note: '作業場所' },
  { address: '東京都新宿区高田馬場2-14-6', point: { lat: 35.712, lng: 139.707 }, note: '作業場所' },
  { address: '東京都品川区大井1-3-6', point: { lat: 35.607, lng: 139.735 }, note: '作業場所' },
  { address: '東京都渋谷区道玄坂1-12-1', point: { lat: 35.658, lng: 139.699 }, note: '作業場所' },
  { address: '東京都江東区新木場2-7-1', point: { lat: 35.643, lng: 139.832 }, note: '作業場所' },
  { address: '東京都千代田区神田錦町2-2-1', point: { lat: 35.693, lng: 139.761 }, note: '作業場所' },
  // デモ操作用（案件登録・業者登録で入力して試せる住所）
  { address: '東京都豊島区東池袋1-1-1', point: { lat: 35.73, lng: 139.715 }, note: 'デモ入力用' },
  { address: '東京都世田谷区三軒茶屋2-11-22', point: { lat: 35.644, lng: 139.67 }, note: 'デモ入力用' },
  { address: '東京都八王子市旭町9-1', point: { lat: 35.656, lng: 139.339 }, note: 'デモ入力用' },
  { address: '神奈川県横浜市西区みなとみらい2-2-1', point: { lat: 35.455, lng: 139.632 }, note: 'デモ入力用' },
  { address: '千葉県千葉市中央区新町1000', point: { lat: 35.612, lng: 140.114 }, note: 'デモ入力用' },
  { address: '埼玉県川口市栄町3-5-1', point: { lat: 35.808, lng: 139.724 }, note: 'デモ入力用' },
  { address: '大阪府大阪市北区梅田3-1-1', point: { lat: 34.703, lng: 135.496 }, note: 'デモ入力用' },
  { address: RASTAQ_OFFICE.address, point: RASTAQ_OFFICE.point, note: 'RASTAQ 東京オフィス' },
];

/** 住所の表記ゆれ（全角・空白・丁目番地号・ハイフンの種類・郵便番号）をそろえる */
export const normalizeAddress = (s: string) =>
  s
    .normalize('NFKC')
    .trim()
    .replace(/^〒?\s*\d{3}-?\d{4}/, '')
    .replace(/\s+/g, '')
    .replace(/(\d)[‐‑‒–—―−ーｰ](?=\d)/g, '$1-')
    .replace(/(\d+)丁目/g, '$1-')
    .replace(/(\d+)番地?/g, '$1-')
    .replace(/(\d+)号/g, '$1')
    .replace(/-+/g, '-')
    .replace(/-(?!\d)/g, '');

const NORMALIZED = DEMO_COORDS.map((d) => ({ ...d, key: normalizeAddress(d.address) }));

/**
 * 住所から座標を取得する（デモ用の対応表のみ）。
 * 番地まで一致した場合だけ座標を返し、建物名などの後続は無視する。
 * 例）「東京都港区虎ノ門3-8-21（○○ビル）」→ 対応表の「東京都港区虎ノ門3-8-21」
 *     「東京都港区虎ノ門3-8-2」「東京都港区虎ノ門3-8-215」→ 一致しない（null）
 */
export const lookupDemoCoord = (address: string): LatLng | null => {
  const a = normalizeAddress(address);
  if (!a) return null;
  const hit = NORMALIZED.find((d) => a.startsWith(d.key) && !/^[-\d]/.test(a.slice(d.key.length)));
  return hit ? hit.point : null;
};

/** 住所の先頭から都道府県を取り出す（見つからなければ null） */
export const prefectureOf = (address: string) => {
  const a = address.normalize('NFKC').replace(/\s+/g, '').replace(/^〒?\d{3}-?\d{4}/, '');
  return PREFECTURES.find((p) => a.startsWith(p)) ?? null;
};
