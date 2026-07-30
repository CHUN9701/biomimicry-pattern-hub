# 待處理事項與待決策清單

最後更新:2026-07-30 · 對應 commit `30d573a`
線上站台:https://biomimicry-pattern-hub.vercel.app/(已驗證,見第四節)

這份文件的用途:專案暫停時把「還沒做的」和「需要人決定的」寫下來,讓下次接手
的人(或未來的 session)不必重新推導。**第一節是需要你決定的,第二節是已知但
還沒動手的,第三節是已經驗證乾淨的基線,第四節是環境與踩過的坑。**

---

## 一、需要你決定的問題

### A1. 實體尺度:每個 type 的畫布代表多寬 ⬅ 最大的一項

**你已決定的部分:**
- 要做,而且認為這能提升專業度
- 尺度滑桿放在**畫布下方,不與其他滑桿混在一起**(理由:它重新定義整個畫布的
  意義,不是調整機制的參數)
- 密度單位採 **(b) 保留密度語意並導入實體尺度**,而不是只改標籤

**還需要你決定的:48 個 type 各自的畫布預設寬度(公尺)。**

我可以依 JSON 裡現有的 `example` 欄位(Mashrabiya 木格窗、蜂巢板、葉脈…)先
推一份 48 筆草案,你只要改不合理的幾筆。以 2m 寬面板換算的結果落在真實可施作
的區間,這反過來說明 2m 是個站得住腳的立面單元預設值:

```
apertureDensity  8–40 列  →  孔距 250mm – 50mm     ← Mashrabiya 的合理範圍
ribDensity       6–24 條  →  肋距 333mm – 83mm
foldDensity      4–16 摺  →  波長 500mm – 125mm    ← 合理的摺板尺寸
veinDensity   60–200 點   →  20 – 67 點/m²
```

### A2. 密度單位要分成三族,不是一種

查過 generator 之後確認:**這 13 個 key 不該共用同一種密度單位。**
「肋條密度 12 條/m²」是沒有意義的 —— 肋條是一維陣列。而且**間距與波長恰好是
設計學生會標在圖上的數字**,比「個/m²」更貼近實務。

| generator 實際在做什麼 | 自然的物理量 | key | 中文標籤 | 現行範圍 | type |
|---|---|---|---|---|---|
| 網格列數 / 線條數 | **間距 mm** | `apertureDensity` | 孔徑密度 | 8–40 | fixed-aperture-grid |
| | | `pinholeDensity` | 針孔密度 | 20–80 | graduated-pinhole |
| | | `cellDensity` | 孔洞密度 | 10–30 | acoustic-diffusion-pattern |
| | | `ribDensity` | 肋條密度 | 6–24 | ribbed-mass-buffer |
| | | `grainDensity` | 紋理密度 | 15–50 | tactile-nature-surface |
| | | `gridDensity` | 網格密度 | 8–24 | minimal-surface-shell |
| 波的個數(空間頻率) | **波長 mm** | `foldDensity` | 摺板密度 | 4–16 | corrugated-thermal-skin |
| | | `waveDensity` | 波形密度 | 1–6 | bistable-snap |
| | | `waveFrequency` | 波紋頻率 | 1–5 | membrane-like-partition |
| | | `flowFrequency` | 流動頻率 | 1–4 | flowing-boundary |
| 在區域內散佈的點數 | **點/m²** | `veinDensity` | 脈絡密度 | 60–200 | leaf-venation-structural |
| | | `streamDensity` | 流線密度 | 60–200 | fluid-dynamic-facade |
| | | `drainDensity` | 排水點密度 | 60–200 | capillary-drainage |

共 15 個滑桿 / 13 個 key。**Gray-Scott(reaction-diffusion)不適用** —— 它的
圖樣尺度由 feed/kill 決定而非由計數決定,不要碰。

**實作方向(已定,待你確認 A1 後即可開工):**
滑桿改成設定間距/波長,個數由尺度推導(`列數 = 寬度 ÷ 間距`)。這樣拖動尺度
滑桿時**圖樣會真的改變** —— 20m 的牆用同樣孔距就需要更多孔。物理上正確,而
且這正是設計學生需要的推論。

必須處理的邊界:20m 寬 × 50mm 孔距 = 400 × 300 = 12 萬個 cell,會卡。作法是
**每個 type 的尺度滑桿各自設上限**,而不是偷偷 clamp 個數 —— 被夾住卻沒說,
學生會以為滑桿失效。

### A3. `frequency` 的語意:要符合文獻還是符合現況實作

`geodesic-dome` 的 `Frequency`(細分頻率,3–8,單位「環」)。

- **文獻慣例**:測地線穹頂的 frequency(nV)指**每條邊的細分數**
- **現況實作**:當成**緯度環數**

兩者數值意義不同,對學生可能誤導。兩條路:

1. 改實作以符合文獻的「邊細分數」—— 術語正確,但要改 generator
2. 改標籤為「緯度環數」以符合現況 —— 改動小,但偏離慣用術語

這也是為什麼 commit `95ff0af` 移除量詞時**唯獨保留了 `frequency` 的「環」**:
它的標籤沒有說明在數什麼,而「環」誠實反映了程式現在的行為。這個決定完之後,
「環」要不要留也一起處理。

### A4. 視覺輔助:要做哪幾項

我建議的優先順序,以及**不**建議的一項:

1. **尺度參考** —— 已由 A1 涵蓋。我會在畫布上直接畫一條比例尺(像地圖的
   scale bar,標「1m」)。純數字要換算,畫出來才讀得出大小。
2. **滑桿臨界標記** —— 在滑桿軌道上加小刻痕,標出**行為性質改變的位置**。
   不是好看,是告訴學生「這裡有事發生」。
   - 最好的例子就是剛修好的 `bistable-snap`:triggerLevel 的臨界點在 50%
     附近,**15% 行程內完成跳變**。沒有標記的話,學生從 0 拖到 35 什麼都沒
     變,很可能以為滑桿壞了就放棄。
   - 其他適用的:`reaction-diffusion` 的 feedRate/killRate(標出離開圖樣生成
     楔形區的邊界)、`fixed-aperture-grid` 的 sunAngle(標出當地夏至/冬至的
     太陽高度角)。
   - **限制**:這需要每個 type 的臨界值,而那不是可以推導出來的 ——
     `bistable-snap` 的 35 是掃了 5 組參數、量了 65 次像素才定出來的。只能對
     「確實存在明確臨界點」的 type 做,大概 6–8 個,不是全部 48 個。
3. **時間軸相位帶** —— 對有時間演化的 generator(Gray-Scott、space
   colonization)顯示「現在在演化的哪個階段」。
4. **參數地圖推廣到其他 type** —— **不建議**。Gray-Scott 的參數地圖之所以成
   立,是因為它的兩個參數共同決定一個「有/沒有圖樣」的二維楔形區,離開就什麼
   都沒有。其他 type 的參數是連續造型參數,畫成地圖只會是一片沒有分區的色塊,
   花成本卻不傳達資訊。

### A5. 要不要把 `embed-json.py` 收進 repo

`lib/biomimicry-subcategories.json` 與 `standalone.html` 內嵌的那份 JSON 必須
逐字一致。目前是手動同步,**這已經是它們第三次漂移的根源**。

我寫了一支腳本做這件事並自我驗證 round-trip(讀回來比對,不一致就 assert
失敗)。目前放在 session 的 scratchpad,**session 結束就消失**。建議收進
`scripts/embed-json.py`。腳本內容附在本文件第五節,以免遺失。

---

## 二、已知但尚未處理

### B1. `lib/data.ts` 的備援滑桿沒有中文標籤

`SliderConfig` 的 `labelZh` 是選填。JSON 那 145 個滑桿都有,但 `lib/data.ts`
的備援滑桿全部沒有(整個檔案只有 1 處 `labelZh`,那是型別定義本身)。

目前 12 個分類2 全部通過 `isVariantExplorerReady()`,所以走不到備援路徑。但
**若某個 type 的滑桿驗證失敗而降級,滑桿會突然只剩英文** —— 一個只在出錯時
才看得到的介面退化。

### B2. `favicon.ico` 404

全站唯一的 console error,純外觀。本機與線上都有。

### B3. 空白畫布的自動檢測門檻對線稿型 generator 不適用

我的驗證腳本用「畫布著墨面積 < 2%」判定空白,但 `vein-flow` 的脈絡網路本來就
只有 1–2% 著墨,會被誤報。**這是驗證工具的問題,不是產品的問題**,但下次跑
稽核時要記得,否則會浪費時間追不存在的 bug。線稿型 generator 應該改用「是否
有任何 alpha > 0 的像素」而非面積比。

---

## 三、已驗證乾淨的基線(commit `30d573a`)

這些都是實測結果,不是推測。重跑稽核時可以拿來當對照。

| 項目 | 狀態 |
|---|---|
| 分類2 完成度 | 12/12,每個 4 個 type = 48 個 type |
| Generator registry | 60 個,**孤兒 0 個** |
| 滑桿 | 145/145 通過(min/max/step/default 落在格點上) |
| 說明面板 | 48/48,三個欄位齊全 |
| 「generator 讀取的參數」vs「滑桿宣告的參數」 | 48 個 type **零不符** |
| 程式碼遺留標記 | `lib/*.ts`、`components/*.tsx`、`app/` 內 **無 TODO/FIXME** |
| standalone.html 與 lib JSON | 逐字一致(round-trip 驗證) |
| standalone 畫布寬度 | 12/12 都是 384px(防的是曾經塌成 2px 的那次回歸) |
| 水平溢出 | desktop 1400px 與 mobile 390px 皆 0 |
| Console errors | 僅 favicon 404 |
| git | `main` 與 `origin/main` 同步,working tree 乾淨 |

---

## 四、線上部署(已驗證)

**https://biomimicry-pattern-hub.vercel.app/** — 公開可讀,無密碼保護。
`x-vercel-cache: HIT`,首頁回應約 0.75s。

**GitHub → Vercel 自動部署確認正常運作。** 驗證方式不是看 HTTP 200(那只證明
頁面存在),而是**讀線上 DOM 比對 repo 內容**:

```
LIVE SITE  https://biomimicry-pattern-hub.vercel.app
  types reached      48/48
  sliders verified   145/145  (min/max/step vs repo)
  info panels        48/48
  snapSharpness DOM  {"min":"35","max":"100","step":"1"}   ← commit 30d573a 已上線
  CJK unit leaks     0                                     ← commit 95ff0af 已上線
  mismatches         0
```

`snapSharpness` 的 min 是 35 而非舊值 0,證明最新 commit 確實部署成功。
畫布繪製也已確認(mobile 12/12、desktop 11/12,那 1 個是 B3 的誤報)。

驗證腳本:`scratchpad/pw-check/check-production.js`(session 結束會消失,若要
長期保留應比照 A5 收進 repo)。

---

## 五、環境與踩過的坑

接手前先讀這節,可以省掉重複除錯。

### 環境

- **repo 實際路徑**:`~/Desktop/專案/biomimicry/biomimicry-pattern-hub`
  (不是 `~/Desktop/bio`,那是 session 的預設工作目錄,是空的)
- **Node**:需要 `export PATH="$HOME/.local/node-current/bin:$PATH"`
- **不要在 `npm run dev` 執行中跑 `npm run build`** —— `.next` 會壞。
  修法:`lsof -ti:3000 | xargs kill -9` → `rm -rf .next` → 重新啟動
- **git 歷史已推上 GitHub,不要改寫歷史**

### 驗證工具的陷阱(都曾造成假警報)

- Playwright 的瀏覽器快取會被 macOS 的 temp 清理程序破壞(`package.json` 消
  失、chromium build 版號不匹配)。快取裡還有可用的 chromium 時,用
  `executablePath` 指過去比重新下載 130MB 快:
  `~/Library/Caches/ms-playwright/chromium-1134/chrome-mac/Chromium.app/Contents/MacOS/Chromium`
- **用 index 點選 type 卡片會選錯**,曾因此報出 88 個不存在的滑桿不符。要用
  `button:has-text("${type.name}")`
- **最大的 canvas 是 WebGL 背景**,`getContext("2d")` 回傳 null。要逐個候選
  試到拿得到 2d context 為止
- `document.body.textContent` 會讀到隱藏的 overlay 文字(standalone 保留節點)
- **hash 路由的頁面,用同一個 hash 重新 `goto` 不會重新渲染**
- `querySelector("span")` 自從加了 `labelZh` 之後會抓到中文而不是數值
- **重新內嵌 JSON 到 standalone.html 時不要多加縮排** —— 我曾因此把 diff 炸成
  4675 行雜訊,真正的變更被埋掉

### 一個方法論教訓(值得記住)

修 `bistable-snap` 時,我第一版用「sigmoid 端點是否接近 0/1」定出下界 25。
**這個判準是錯的** —— 端點到達極值不等於跳變區間夠窄。實際量畫布上波峰到波谷
的像素高度之後才發現 25 仍然是跨半數行程的斜坡,真正的分界是 35:

```
snapSharpness=25   trigger 0→100:  28 32 36 40 44 51 67 85 100  ← 斜坡
snapSharpness=35   trigger 0→100:  26 27 28 30 33 41 61 85 100  ← 先平,然後跳
```

**解析式的推導會給出看似合理但錯誤的答案;要驗證視覺行為就得量像素。**
同樣的教訓也發生在 Gray-Scott 分區掃描(4.2 秒的沉降時間讓所有格子都停在
暫態,全被標成 spots),以及 standalone 畫布塌成 2px 卻 145/145 通過(因為
**沒有任何一條斷言在量畫布尺寸**)。

### `embed-json.py`(A5 提到的腳本,存此以免遺失)

```python
#!/usr/bin/env python3
"""Re-embed lib/biomimicry-subcategories.json into standalone.html's inline copy.
Doing this by hand is how the two builds drift, so it lives in one place and
verifies the round-trip before writing."""
import json, sys
REPO = "/Users/chun/Desktop/專案/biomimicry/biomimicry-pattern-hub"
SA, LIB = f"{REPO}/standalone.html", f"{REPO}/lib/biomimicry-subcategories.json"

lines = open(SA, encoding="utf-8").read().split("\n")
start = next(i for i, l in enumerate(lines) if l.strip().startswith("const subcategoryData = {"))
depth, end = 0, None
for i in range(start, len(lines)):
    depth += lines[i].count("{") - lines[i].count("}")
    if depth == 0 and i > start:
        end = i; break
if end is None: sys.exit("could not find end of subcategoryData block")

data = json.load(open(LIB, encoding="utf-8"))
# Match the file's existing format byte-for-byte: no extra base indent, or the
# diff becomes a 4600-line indentation rewrite that buries the real change.
emb = "  const subcategoryData = " + json.dumps(data, ensure_ascii=False, indent=2) + ";"
lines[start:end + 1] = emb.split("\n")
open(SA, "w", encoding="utf-8").write("\n".join(lines))

# read it back the same way the browser would, and prove it equals the source
lines = open(SA, encoding="utf-8").read().split("\n")
depth, e2 = 0, None
for i in range(start, len(lines)):
    depth += lines[i].count("{") - lines[i].count("}")
    if depth == 0 and i > start:
        e2 = i; break
back = json.loads("\n".join(lines[start:e2 + 1]).split("=", 1)[1].strip().rstrip(";"))
assert back == data, "round-trip mismatch — standalone.html would disagree with lib"
print(f"embedded ok: lines {start+1}-{e2+1}, {len(data['categories'])} categories, round-trip verified")
```

---

## 六、其他

**MCP 連接器未授權**:PubMed、bioRxiv、ChEMBL 等目前未授權,session 內無法跑
OAuth。這跟本專案有關 —— 若授權,`principle` 說明與參數地圖上那句「若用於研究
或報告,請自行核對原始文獻」就能真的去查證,而不只是標警語。要用的話請在
claude.ai 的連接器設定裡授權。

**兩處刻意保留的誠實聲明**(不是待辦,是設計決定,不要當成 bug 移除):
- 參數地圖:「分區標籤為本模擬之視覺判讀近似結果,非取自文獻座標。」
  —— 分區資料來自對本專案模擬的自動掃描,不是 Pearson 的發表座標
- 說明面板:「原理與應用說明為依據各機制推導整理,非逐條文獻查證。」
