# MadeClothing Restored

這個資料夾保留原本 `dist/`，並在 `restored/` 裡建立可維護的恢復版。

## 啟動方式

開兩個 PowerShell 視窗。

第一個視窗：

```powershell
npm run dev:backend
```

第二個視窗：

```powershell
npm run dev:frontend
```

打開：

```text
http://127.0.0.1:5173/
```

測試帳密：

```text
admin / admin123
test / test123
```

## 重置假資料

```powershell
npm run reset:data
```

目前資料存在：

```text
restored/backend/data/db.json
```

乾淨初始資料存在：

```text
restored/backend/data/seed.json
```
