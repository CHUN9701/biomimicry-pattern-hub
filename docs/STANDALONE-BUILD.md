# standalone.html 現在是產物,不要手改

`standalone.html` 由 `standalone.template.html` + `lib/` 打包產生:

```bash
npm run build:standalone    # 產生 standalone.html
npm run check:standalone    # 只驗證有沒有過期,不寫檔(給 CI 用)
```

檔頭有 `GENERATED FILE — do not edit` 橫幅。手改它不會壞掉,但下次 build 就被覆蓋,
而且 `npm run check:standalone` 會失敗——這正是它要抓的情況。

## 為什麼要做這件事

改動前,`standalone.html` 裡有一份**手寫的第二份實作**:工具函式、分類資料、內嵌 JSON、
Gray-Scott 分區、尺度推導、以及全部 60 個 generator。共 **5,024 行**。

代價可以量化。尺度功能那一次改動:

```
lib/generators.ts    +79  −21
standalone.html     +479 −138     ← 同一個功能,5 倍以上的成本
```

而且 `docs/OPEN-ITEMS.md` 記錄的每一次兩份 build 漂移,根源都是這件事:JSON 漂移三次、
一次多加縮排把 diff 炸成 4,675 行雜訊、以及那支專門用來對抗漂移的 `embed-json.py`。
**兩份實作不會因為紀律變好而停止漂移,只會因為只剩一份而停止。**

## 現在的分工

| 檔案 | 角色 | 誰維護 |
|---|---|---|
| `lib/*.ts` | 全部邏輯:generator、尺度推導、資料、shader 原始碼 | 手寫,唯一來源 |
| `lib/standalone-runtime.ts` | lib 與 standalone 之間的契約(匯出清單) | 手寫 |
| `standalone.template.html` | **只有 UI 外殼**:markup/CSS、hash router、畫面繪製 | 手寫 |
| `standalone.html` | 上面兩者的打包結果 | **產物,勿改** |

打包後的邏輯掛在 `window.BPH`,template 開頭把它解構成原本的名字,所以 UI 程式碼不用改:

```js
const { rgba, categories, createGenerator, SCALE_TIERS, /* …共 25 個 */ } = BPH;
```

要讓 standalone 用到 lib 的新東西,就在 `lib/standalone-runtime.ts` 加一行 export,
再在 template 的解構清單加上名字。build script 會比對兩邊:**template 解構了但 lib 沒
export,build 直接失敗**,不會產生一個載入就 ReferenceError 的檔案丟給學生。

## 刻意沒有共用的部分

**mesh gradient driver 留在 template 裡。** `MeshGradientCanvas.tsx` 在掛載時固定顏色,
standalone 這支則會在調色盤之間做動畫過渡(`setColors`)——因為它沒有 React 的 remount
可以依賴。API 不同,硬共用會改到 Next.js 版的視覺行為,所以只共用 `lib/shaders.ts` 的
shader 原始碼。

**沒有 minify。** standalone.html 是要交給學生用單一檔案離線打開、而且可以讀的東西;
minify 過的 blob 雖然能跑,但會讓這個檔案變成不透明,diff 也無法審。代價是檔案大小,
而本機使用不在乎大小。(順帶說明:663KB 裡有 375KB 是 CSS 內嵌的一張 base64 JPEG 背景,
跟這次改動無關。)

## 驗證方式

刪掉 5,024 行實作,唯一站得住的驗證是**比對像素**,不是「看起來還在動」:

```bash
npm run check:parity     # lib/ 對上舊版手寫實作,逐像素比對
npm run check:scale      # 48 個 type 的尺度功能稽核
```

`check:parity` 把**舊 revision 的手寫實作**與**現在的 lib bundle** 載入同一個頁面,
用同樣的參數、同樣的 draw 呼叫順序各畫一次,逐像素比對。遷移當時的結果:

```
GENERATOR PARITY  lib/ (current) vs 923fca8:standalone.html
  types compared     48
  pixel-identical    48/48   (3 frames each)
  console errors     0
```

三個 frame 而非一個,是因為 Gray-Scott 與 space colonization 有內部狀態,
只比 t=0 會漏掉「跑了幾步之後才分岔」的情況。

這支腳本吃 `REF=<git-ref>`,所以未來任何 generator 重構都可以拿它問同一個問題:
**我改的東西動到畫面了嗎?**

## `scripts/embed-json.py` 已刪除

它的工作是讓 `standalone.html` 內嵌的 JSON 與 `lib/biomimicry-subcategories.json`
保持一致。現在 JSON 由 bundle 直接 import,**只有一份,不可能不一致**,所以這支腳本
沒有存在意義了。`docs/OPEN-ITEMS.md` 的 A5(要不要把它收進 repo)因此消失,不是被決定,
是問題本身不見了。
