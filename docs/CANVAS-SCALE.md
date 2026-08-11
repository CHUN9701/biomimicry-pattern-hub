# 畫布實體尺度(A1／A2／A3／A4 的實作紀錄)

原本的 A1「每個 type 的畫布代表多寬」已定案並鋪滿 48 個 type。這份文件是**實作後的參考**,
取代先前的 `SCALE-PROPOSAL-draft.md`。決策來源見 `docs/OPEN-ITEMS.md` 的 A1–A4。

## 決定:四個固定檔位,不是 48 個各自的寬度

| 檔位 | 預設 | 範圍 | 代表 | type 數 |
|---|---|---|---|---|
| 材料 `material` | 0.6 m | 0.15–1.2 m | 一片板材 / 表面的一塊 | 7 |
| 構件 `component` | 2 m | 0.5–5 m | 一個立面單元 / 一片牆 | 17 |
| 空間 `space` | 8 m | 2–20 m | 一個房間 / 一跨結構 | 14 |
| 量體 `mass` | 40 m | 10–120 m | 整棟建築 / 一片地景 | 6 |
| (不設尺度) | — | — | reaction-diffusion 家族 | 4 |

**為什麼是檔位而不是每個 type 一個寬度**:48 個各自的寬度會讓兩個看起來一樣密的圖樣實際上差 20 倍,
而學生無從得知;要維護的數字也是 48 個。四個檔位讓同一檔位內的畫布代表同一種尺度,因此可以互相比較。
代價是少數 type 的真實尺度被四捨五入(穹頂 30m → 量體檔 40m、Al Bahar 單元 4.2m → 構件檔 2m),
但推導出的間距全部仍落在可施作區間。

檔位範圍刻意在邊界重疊(1.2 / 2、5 / 8、20 / 40),讓落在邊界的 type 還能推進鄰檔。
上限同時是效能上限:構件檔 5m 配最細 50mm 孔距 = 100 × 100 = 10,000 cell。

**Gray-Scott 那 4 個 type 不給尺度滑桿**(`turing-pattern-skin`、`cellular-growth-simulation`、
`coral-growth-pattern`、`diffusion-limited-aggregation`):圖樣尺度由 feed/kill 決定,
沒有可由寬度推導的個數。硬給一根拖了不會變的滑桿比不給更糟。代價是 48 個裡有 4 個沒有比例尺。

## 密度滑桿 → 實體單位(A2)

原本 13 個 key 共用「個數」這種單位。改法**依 generator 實際在做什麼**分成五族,而不是依滑桿名稱:

| derive | 含意 | 推導 | 用在 |
|---|---|---|---|
| `gridPitch` | 二維格網間距 mm | 列數 = 寬度 ÷ 間距,排數依畫布比例 | 5 支 |
| `linePitch` | 沿**寬度**的間距 mm | 道數 = 寬度 ÷ 間距 | 2 支 |
| `rowPitch` | 沿**高度**的間距 mm | 道數 = 畫布高 ÷ 間距 | 2 支 |
| `wavelength` | 一個完整波長 | 波數 = 寬度 ÷ 波長 | 3 支 |
| `areaDensity` | 點/m² | 點數 = 密度 × 面積 | 3 支 |

**改動過程中修正了 A2 表格的兩處誤判**——這兩處都是「看標籤」與「看程式」會得到不同答案的地方:

- `bistable-snap` 的 `waveDensity` 在程式裡是**垂直堆疊的帶數**(`rows = h / waveDensity`),
  不是沿寬度的波數。所以它的實體量是**帶高**(`rowPitch`),不是波長。
- `membrane-like-partition` 與 `flowing-boundary` 的頻率是**每像素的空間頻率**
  (`freq = 0.006 × waveFrequency`),不是「畫布上有幾個波」。換算成波長後,
  membrane 的預設是 2700 mm、flowing 是 13 m —— 曲線比房間本身還寬,這是它們原本就有的行為。
- `tactile-nature-surface` 的紋理線是**水平線、沿高度堆疊**,所以間距讀的是高度而非寬度。

轉換後的滑桿一覽:

| type | 檔位 | 新 key | 範圍 | 預設 |
|---|---|---|---|---|
| fixed-aperture-grid | 構件 | `aperturePitch` | 50–250 mm | 100 |
| deep-well-shadow | 構件 | `aperturePitch` | 60–250 mm | 140 |
| directional-louver-aperture | 構件 | `slitPitch` | 80–340 mm | 170 |
| graduated-pinhole | 構件 | `pinholePitch` | 25–100 mm | 45 |
| acoustic-diffusion-pattern | 材料 | `cellPitch` | 20–60 mm | 34 |
| ribbed-mass-buffer | 構件 | `ribPitch` | 80–340 mm | 170 |
| minimal-surface-shell | 空間 | `gridSpacing` | 330–1000 mm | 570 |
| tactile-nature-surface | 材料 | `grainPitch` | 12–40 mm | 20 |
| bistable-snap | 構件 | `bandHeight` | 330–2000 mm | 670 |
| corrugated-thermal-skin | 構件 | `foldWavelength` | 125–500 mm | 250 |
| membrane-like-partition | 構件 | `membraneWavelength` | 1000–5500 mm | 2700 |
| flowing-boundary | 空間 | `flowWavelength` | 6–26 m | 13 |
| leaf-venation-structural | 空間 | `veinDensity` | 0.6–1.9 點/m² | 1.6 |
| fluid-dynamic-facade | 構件 | `streamDensity` | 8–30 點/m² | 28 |
| capillary-drainage | 構件 | `drainDensity` | 6–30 點/m² | 24 |

**預設值的訂法**:讓「預設推導出來的個數」與改動前一致,所以初次打開畫面看起來一樣,
變的是那個數字的意義。實測對照:孔徑 20 列(原 20)、井 14 列(原 14)、縫 12 列(原 12)、
針孔 44 列(原 45)、摺板 8.0 波(原 8)、肋 12 道(原 12)、帶 3 道(原 3)、
網格 14 道(原 14)、葉脈 120 點(原 120)、流線 131 點(原 130)、排水 112 點(原 110)、
聲學 18 列(原 18)。**唯一有變的是 `tactile-nature-surface`**:20 mm 紋理間距在桌機比例下推出
35 道(原本固定 30 道)。20 mm 是比較站得住的實體數字,所以留下這個差異而不是回頭湊。

## 尺度軸不是「寬」的那幾個(A1 的附帶問題)

滑桿一律是**畫布寬度**(單一推導來源),但這 6 個 type 的可讀維度不是寬,所以在面板上直接寫明:

| type | 說明 |
|---|---|
| `geodesic-dome` | 畫布寬度即穹頂直徑 |
| `logarithmic-shell-spiral` | 畫布寬度即螺旋外徑 |
| `recursive-canopy` | 畫布寬度為屋頂跨距 |
| `spiral-growth-tower` | 塔高約為畫布高度(寬度 × 畫布長寬比) |
| `branching-structural-column` | 柱高約為畫布高度 |
| `root-system-foundation` | 深度約為畫布高度 |

## A3:`frequency` 的語意

依「兩者都標」處理:`geodesic-dome` 的滑桿改為 **Latitude Rings / 緯度環數**,generator 不動,
並在滑桿下方註明「與文獻中測地線穹頂的 frequency(nV,每條邊的細分數)不是同一個量」。
`principle` 與 `mappingRule` 裡把兩者當成同義詞的文字也一併改掉。

## A4:視覺輔助

- **比例尺** ✅ 畫布左下角,隨尺度換檔(0.5m→10cm、2m→50cm、8m→2m、40m→10m)
- **滑桿臨界標記** ✅ 機制已做(`ticks` + `ticksNote`),目前只用在 `fixed-aperture-grid` 的
  `sunAngle`(冬至 42°／春秋分 65°／夏至 88°,台北 25°N)。其餘 5–7 個有明確臨界點的 type
  需要逐一實測掃參數才能標,尚未做。
- **時間軸相位帶** ❌ 未做。適用對象是 Gray-Scott 與 space colonization 那幾個。
- **參數地圖推廣** ❌ 不做(其他 type 的參數是連續造型參數,畫成地圖是一片沒有分區的色塊)。

## 實作位置

| 檔案 | 內容 |
|---|---|
| `lib/scale.ts` | 四檔定義、五種推導、比例尺長度選擇、格式化 |
| `lib/data.ts` | `SliderConfig` 的 `derive` / `deriveUnit` / `ticks` / `ticksNote` |
| `lib/subcategoryTypes.ts` | `scaleTier` / `scaleNoteZh` 讀取與驗證 |
| `lib/generators.ts` | 15 個 generator 由尺度推導個數;`forEachApertureCellByCols` |
| `components/PlaygroundCanvas.tsx` | 尺度面板(畫布下方)、比例尺、臨界刻痕、推導讀數 |
| `components/MechanismTypeList.tsx` | mini preview 也帶入檔位預設值 |
| `standalone.html` | 同樣的邏輯與 UI(獨立實作,已同步) |
| `scripts/check-scale.js` | 48 個 type 的稽核(dev server 或離線檔皆可) |
| `scripts/check-production.js` | 線上稽核已認得尺度滑桿 |

## 驗證結果

`node scripts/check-scale.js`(離線 standalone)與 `BASE_URL=http://localhost:3000 node scripts/check-scale.js`
兩者皆:

```
types reached        48/48
extent sliders       44/44  (檔位範圍 + 開啟值)
types with no tier   4/4    (Gray-Scott 家族,設計如此)
derive readouts      15/15
console errors       0
problems             0
```

`npm run build` 通過、`tsc --noEmit` 乾淨、145/145 滑桿通過驗證、390px 水平溢出 0。

## 還沒做的(接手時看這裡)

1. **px 單位滑桿仍是裝置像素:15 支、9 個 key、14 個 type**(數字是掃 JSON `unit === "px"` 得到的,
   不要憑印象列):`lineWidth`(5 支)、`memberThickness`(2)、`wallThickness`(2)、`memberWidth`、
   `strutThickness`、`branchWidth`、`cellSize`、`apertureScale`、`louverLength`。畫布有了實體尺度之後,
   同一畫面在 Retina 與非 Retina 代表不同的實體厚度,應一併改成 mm。這是目前最明顯的不一致。

   其中 **`honeycomb-panel` 的 `cellSize`(15–45px)本質是間距而非厚度**,應歸進 `gridPitch` 那族由
   尺度推導,不是單純換單位 —— 它是這 15 支裡唯一需要改推導方式的。
2. **臨界標記只做了 1 個 type**(見上 A4)。
3. **時間軸相位帶未做**(見上 A4)。
4. **`lib/data.ts` 備援滑桿沒有中文標籤**(B1,與本次改動無關但仍在)。備援路徑刻意不給尺度滑桿,
   因為它沒有 `scaleTier`。
