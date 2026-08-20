---

# Apple Photos v5.5.2 Drive Cache

## Cloudflare Worker + Google Drive 私人照片管理系统

版本：

```
Apple Photos v5.5.2
Drive Cache Edition
```

技术：

* Cloudflare Workers
* Cloudflare KV Cache
* Google Drive API
* Google OAuth2
* Cloudflare Image Resizing
* EXIF 时间排序
* 手机端 Apple Photos 风格 UI

---

# ⚠️ 重要声明（请阅读）

## EXIF 信息读取风险说明

本项目支持读取照片 EXIF 信息：

例如：

```
拍摄时间

GPS 经纬度

设备型号

相机型号

镜头信息

软件版本

曝光参数

```

其中主要用于：

```
imageMediaMetadata.time
```

读取照片拍摄时间：

例如：

```
2024:05:20 18:33:12
```

用于：

* 年份归档
* 月份归档
* 时间排序

---

## ⚠️ 隐私风险

部分照片可能包含：

### GPS 位置信息

例如：

```
Latitude:
37.7749

Longitude:
-122.4194
```

如果照片公开分享：

可能泄露：

* 家庭地址
* 工作地点
* 常去位置
* 旅行路线

---

### 手机设备信息

可能包含：

```
Apple iPhone 15 Pro

iOS Camera

Lens Model

```

可能暴露：

* 手机型号
* 拍摄设备

---

### 第三方 AI 风险

未来 AI 模块可能支持：

```
人脸识别

物体识别

智能相册

地点分析
```

如果启用：

照片内容可能需要发送到 AI 服务。

---

# 如果你介意：

建议：

关闭 EXIF 读取

上传前：

使用：

```
导出照片
```

或：

```
删除 EXIF
```

工具处理。

---

# 本项目适合：

✅ 个人私有照片库
✅ 家庭照片服务器
✅ Google Drive 私人图库
✅ Cloudflare 全球访问

---

# 不适合：

❌ 存储高度敏感照片

❌ 商业用户未经隐私评估直接使用

❌ 不希望任何 EXIF 信息被读取的人

---

# 部署结构

```
用户浏览器

      |
      |
Cloudflare Worker

      |
      |
Google Drive API

      |
      |
Google Drive Folder


      +

Cloudflare KV Cache

```

---

# 一、准备环境

需要：

## 1. Cloudflare 账号

地址：

[https://dash.cloudflare.com](https://dash.cloudflare.com)

需要：

* Workers
* KV Namespace

---

## 2. Google Cloud 项目

打开：

[https://console.cloud.google.com](https://console.cloud.google.com)

创建项目：

例如：

```
Apple Photos Worker
```

---

# 二、开启 Google Drive API

进入：

```
APIs & Services

↓

Library

↓

Google Drive API

↓

Enable

```

---

# 三、创建 OAuth 凭证

进入：

```
APIs & Services

↓

Credentials

↓

Create Credentials

↓

OAuth Client ID
```

类型：

```
Desktop App
```

或者：

```
Web Application
```

获取：

```
CLIENT_ID

CLIENT_SECRET

```

---

# 四、获取 REFRESH_TOKEN

授权：

Google OAuth

权限：

```
https://www.googleapis.com/auth/drive
```

最终得到：

```
REFRESH_TOKEN
```

---

# 五、创建 Google Drive 文件夹

例如：

```
My Photos
```

获取 Folder ID

地址：

```
https://drive.google.com/drive/folders/xxxxxxxx
```

其中：

```
xxxxxxxx
```

就是：

```
FOLDER_ID
```

---

# 六、Cloudflare Worker 配置

进入：

```
Workers

↓

Settings

↓

Variables
```

添加：

---

## Environment Variables

| 变量            | 说明                     |
| ------------- | ---------------------- |
| CLIENT_ID     | Google OAuth Client ID |
| CLIENT_SECRET | Google OAuth Secret    |
| REFRESH_TOKEN | Google Refresh Token   |
| FOLDER_ID     | Google Drive 文件夹 ID    |
| ADMIN_KEY     | 管理员密码                  |

---

例如：

```
CLIENT_ID

xxxxx.apps.googleusercontent.com


CLIENT_SECRET

xxxxx


REFRESH_TOKEN

xxxxx


FOLDER_ID

1AbCdEfGhijk


ADMIN_KEY

your_password
```

---

# 七、KV Cache 配置

创建 KV：

进入：

```
Workers

↓

KV

↓

Create namespace
```

名称：

```
PHOTO_CACHE
```

绑定 Worker：

```
Settings

↓

Bindings

↓

KV Namespace
```

变量名：

```
PHOTO_CACHE
```

代码中使用：

```javascript
ENV.PHOTO_CACHE
```

---

# 八、上传 Worker

文件：

```
worker.js
```

部署：

```
Workers

↓

Create Worker

↓

Edit Code

↓

Paste

↓

Deploy
```

---

# 九、首次登录

访问：

```
https://你的worker域名/
```

管理员：

```
https://你的worker域名/admin
```

输入：

```
ADMIN_KEY
```

成功后：

Cookie:

```
photos_admin
```

有效期：

```
86400 秒
```

即：

24小时

---

# 十、照片上传流程

浏览器：

```
上传照片

↓

Worker

↓

Google Drive API

↓

指定 FOLDER_ID

↓

保存照片

```

上传后：

自动设置：

```
anyone

reader
```

所以：

上传照片默认公开访问。

---

# ⚠️ 重要安全提醒

当前代码：

```javascript
type:"anyone",
role:"reader"
```

意味着：

Google Drive 文件：

公开读取。

即：

知道图片 ID

即可访问：

```
/file/{id}
```

---

如果用于私人照片：

建议修改：

删除：

```javascript
type:"anyone"
```

改成：

```
private
```

或者：

增加：

```
签名 URL
```

---

# 十一、EXIF 排序逻辑

服务器读取：

```javascript
file.imageMediaMetadata.time
```

优先：

```
照片拍摄时间
```

否则：

```
createdTime
```

排序：

```
最新照片优先
```

---

# 十二、Cloudflare 图片处理

缩略图：

```
/thumb/{id}?w=400
```

使用：

Cloudflare Image Resizing

自动：

* WebP
* AVIF
* 压缩
* 缩放

---

# 十三、缓存机制

照片列表：

缓存：

```
photos_drive_list_v552
```

时间：

```
300秒
```

流程：

```
请求

↓

KV Cache

↓

命中

↓

直接返回


未命中

↓

Google Drive API

↓

写入 KV

```

---

# 十四、目录结构

Google Drive：

```
My Photos

├── IMG001.jpg
├── IMG002.jpg
├── IMG003.jpg
│
├── photos_favorites.json
│
└── photos_ai.json
```

---

# 十五、权限建议

推荐：

Google Drive：

创建专用账号：

例如：

```
photos-storage@gmail.com
```

不要：

使用私人主账号。

原因：

如果：

```
REFRESH_TOKEN
```

泄露：

攻击者可能访问整个 Drive。

---

# 十六、必须保护的变量

以下绝不能公开：

```
CLIENT_SECRET

REFRESH_TOKEN

ADMIN_KEY
```

泄露后：

可能导致：

* Drive 数据访问
* 照片删除
* 管理权限获取

---

# 十七、当前版本功能

已实现：

✅ Google Drive 存储

✅ OAuth 自动刷新 Token

✅ 上传

✅ 删除

✅ 图片代理

✅ 缩略图

✅ KV 缓存

✅ 手机端 UI

✅ 分享页面

✅ 收藏系统

✅ AI 接口预留

---

# 十八、已知限制

## 1. EXIF 依赖 Google Drive metadata

不是直接解析原图。

---

## 2. 分享链接目前无权限控制

例如：

```
/share/photo_id
```

公开。

---

## 3. 图片默认公开

需要私人模式请修改：

```
permissions
```

---

## 4. 大规模图库需要分页优化

当前：

```
100/page
```

适合：

几千张照片。

---

# 十九、升级建议路线

## v5.6

建议：

加入：

* 私有图片签名 URL
* JWT 登录
* 多账户 Drive
* 用户隔离
* EXIF 开关

---

## v5.7

加入：

* Cloudflare R2 缓存层
* 图片永久 CDN
* AI 分类
* 人脸本地识别

---

# 最终免责声明

> 本项目读取照片 EXIF 信息用于照片时间管理和排序。EXIF 可能包含个人位置、设备和拍摄信息。
> 如果您不接受照片元数据被读取、处理或潜在泄露，请不要使用本项目。
> 使用本项目即代表您了解并接受相关隐私风险。

```
EXIF 不喜勿用。
私人照片请自行评估风险。
```

---

以上文档可直接作为项目部署说明。建议下一步升级 **v5.5.3 安全版**：

1. EXIF 开关
2. 私有图片模式
3. 分享签名 URL
4. 多账户隔离
5. 防止 FOLDER_ID 泄露导致越权访问。
