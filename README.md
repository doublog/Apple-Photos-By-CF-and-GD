# Apple Photos v5.5.1 使用帮助与隐私说明

## 1. 项目简介

Apple Photos 是一个基于 Cloudflare Worker + Google Drive 的私人照片管理系统。

主要功能：

* 管理员上传照片
* 管理员删除照片
* 游客浏览照片
* 图片分享
* 照片分页加载
* Google Drive 云端存储
* 图片代理访问
* 收藏功能
* 管理员权限控制
* Drive Cache 加速

---

# 2. 用户权限说明

## 管理员

管理员登录后可以：

* 上传照片
* 删除照片
* 管理照片内容
* 使用上传队列功能

## 游客

游客只能：

* 浏览公开照片
* 查看分享链接

游客禁止：

* 上传照片
* 删除照片
* 修改照片数据

---

# 3. 照片上传说明

上传流程：

```
选择照片
    ↓
浏览器上传
    ↓
Cloudflare Worker 接收
    ↓
Google Drive 保存
    ↓
照片列表更新
```

支持：

* 多照片上传
* 上传进度显示
* 上传失败提示
* 自动刷新照片列表

---

# 4. 重要隐私说明：EXIF 信息读取风险

## ⚠️ 本系统会读取照片 EXIF 信息

照片文件通常可能包含 EXIF 元数据。

EXIF 是相机或手机自动写入照片中的信息。

可能包含：

* 拍摄时间
* GPS 地理位置
* 手机型号
* 相机型号
* 镜头信息
* 拍摄参数
* 软件信息

例如：

```
照片.jpg

EXIF:

拍摄时间:
2026-08-18 10:30

GPS:
Latitude:
31.xxxxxx

Longitude:
121.xxxxxx

设备:
iPhone
```

---

# 5. EXIF 隐私风险

如果照片包含 GPS 信息，可能暴露：

* 家庭住址
* 工作地点
* 常去位置
* 旅行路线
* 拍摄时间规律

如果照片分享给其他人，可能存在：

```
照片公开
      ↓
EXIF信息泄露
      ↓
他人获取拍摄位置
```

因此：

## 不建议上传包含敏感位置的原始照片。

---

# 6. EXIF 处理建议

推荐上传前：

### 方法1：关闭手机定位照片

iPhone：

```
设置
 ↓
隐私与安全性
 ↓
定位服务
 ↓
相机
 ↓
关闭
```

Android：

```
相机设置
 ↓
关闭
保存位置信息
```

---

### 方法2：上传时自动清除 EXIF

建议版本：

Apple Photos v5.5.2

增加：

```
上传照片
 ↓
浏览器处理
 ↓
删除EXIF
 ↓
上传Google Drive
```

清除：

* GPS
* 设备信息
* 镜头信息
* 软件信息

保留：

* 图片内容
* 图片质量

---

# 7. Google Drive 存储说明

照片实际存储位置：

```
Google Drive
        |
        |
Apple Photos Folder
```

系统不会把照片保存到 Worker 本地。

Worker 只负责：

* 身份验证
* 图片请求代理
* 上传转发
* 权限控制

---

# 8. Drive Cache 加速说明（v5.5.1）

v5.5.1 增加：

```
Google Drive
       |
       |
照片列表缓存
       |
       |
Cloudflare KV
```

作用：

* 减少 Google API 请求
* 加快首页打开速度
* 降低加载等待

缓存内容：

包含：

* 文件ID
* 文件名
* 创建时间
* 图片列表信息

不建议缓存：

* 原始照片
* 用户隐私数据

---

# 9. Config 配置安全说明

以下配置属于敏感信息：

```
CLIENT_ID

CLIENT_SECRET

REFRESH_TOKEN

ADMIN_KEY

DRIVE_FOLDER_ID
```

不要：

* 上传到 GitHub
* 分享给他人
* 放入公开网页
* 发布截图

建议：

使用 Cloudflare Worker Environment Variables：

```
CLIENT_ID
CLIENT_SECRET
REFRESH_TOKEN
ADMIN_KEY
```

Cloudflare Worker 增加 KV

进入：

Cloudflare Dashboard

↓

Workers

↓

你的 Worker

↓

Settings

↓

Bindings

↓

Add binding

添加：
```
Type:
KV Namespace

Variable name:

PHOTO_CACHE

Namespace:

创建一个新的 KV
```

例如：

```
PHOTO_CACHE
```

---

# 10. 图片访问安全

公开图片访问：

```
/file/{id}
```

如果开启：

```
anyone reader
```

Google Drive 图片可能被访问。

如果需要私人相册：

建议：

* 删除公开权限
* 使用 Worker 鉴权
* 增加登录访问

---

# 11. 数据安全建议

建议：

定期：

* 检查 Google Drive 权限
* 更换管理员密码
* 删除不用的 OAuth Token
* 备份照片

不要上传：

* 身份证照片
* 护照照片
* 银行资料
* 含家庭地址的照片

---

# 12. 推荐升级路线

## v5.5.1

已完成：

✅ Drive Cache
✅ 首页加载优化
✅ 减少 Google API 请求

## v5.5.2

建议：

✅ 上传自动清除 EXIF
✅ 自动生成缩略图

## v5.6

计划：

✅ Thumbnail Engine
✅ 虚拟滚动
✅ 大规模照片优化

---

# 最终隐私提醒

Apple Photos 可以作为私人照片管理系统使用，但：

**照片文件本身可能包含隐藏 EXIF 信息。**

上传前请确认：

* 是否允许保存拍摄时间
* 是否允许保存地理位置
* 是否需要清除设备信息

对于敏感照片，建议启用 EXIF 清除功能后再上传。
