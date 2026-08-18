# Apple-Photos-By-CF-and-GD
苹果流版相册，Google Drive存储系统，部署在cloudflare worker

---

# Apple Photos v5.4.1 Final

## Cloudflare Worker 私人相册系统开发文档

版本：v5.4.1 Final
架构：Cloudflare Workers + Google Drive API
前端：HTML + CSS + JavaScript
存储：Google Drive
权限：管理员 / 游客分离

---

# 1. 项目简介

Apple Photos v5.4.1 是一个基于 Cloudflare Worker 的私人照片管理系统。

主要功能：

* Google Drive 云存储
* 管理员登录
* 游客只读浏览
* 图片上传
* 图片删除
* 图片列表
* 图片代理访问
* 图片分享
* 收藏功能
* AI 扩展接口预留
* 移动端 Apple Photos 风格界面

系统结构：

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

照片文件
```

---

# 2. 文件结构

当前项目为单文件 Worker：

```
worker.js
```

主要分区：

```
worker.js

│
├── CONFIG 配置
│
├── Google OAuth
│
├── Drive API
│
├── 上传模块
│
├── 删除模块
│
├── 图片列表
│
├── 图片代理
│
├── 收藏系统
│
├── 管理员认证
│
├── HTML 首页
│
├── 前端上传队列
│
└── Worker Router
```

---

# 3. 配置说明

## CONFIG

代码：

```javascript
const CONFIG={}
```

作用：

保存系统核心参数。

## CLIENT_ID

Google OAuth Client ID

用途：

获取 Drive 访问权限。

## CLIENT_SECRET

Google OAuth 密钥

用途：

OAuth token 刷新。

---

## REFRESH_TOKEN

Google 长期授权 Token

用途：

Worker 自动访问 Google Drive。

---

## DRIVE_FOLDER_ID

照片存储目录：

```javascript
DRIVE_FOLDER_ID
```

所有上传照片保存到这里。

---

## ADMIN_KEY

管理员密码。

用途：

登录后台。

---

# 4. 权限系统

系统分两种身份：

## 游客

权限：

✅ 查看照片

✅ 分享照片

禁止：

❌ 上传

❌ 删除

---

## 管理员

权限：

✅ 查看

✅ 上传

✅ 删除

✅ 管理照片

判断代码：

```javascript
isAdmin(request)
```

---

# 5. 管理员登录流程

访问：

```
/admin
```

输入：

```
ADMIN_KEY
```

成功后：

服务器返回 Cookie：

```
photos_admin
```

之后访问首页：

```javascript
isAdmin(request)
```

判断身份。

---

# 6. 上传系统

接口：

```
POST

/api/upload
```

流程：

```
选择图片

↓

FormData

↓

Worker

↓

Google Drive

↓

返回结果

```

权限检查：

```javascript
if(!isAdmin(request))
```

游客上传：

返回：

```json
{
"error":
"游客禁止上传"
}
```

---

# 7. 上传队列 v5.4.2

前端模块：

```javascript
uploadTasks[]
```

任务状态：

```
waiting

等待


uploading

上传中


done

完成


error

失败
```

上传流程：

```
选择多图

↓

创建任务

↓

进入队列

↓

逐个上传

↓

刷新照片

↓

关闭窗口

```

---

# 8. 图片列表

接口：

```
GET

/api/page
```

返回：

```json
{
total:100,

files:[
{
id:"",
name:"",
url:""
}
]
}
```

前端：

```javascript
loadPhotos()
```

负责加载。

---

# 9. 图片显示

图片访问：

```
/file/{id}
```

Worker：

```javascript
imageProxy()
```

作用：

隐藏 Google Drive 地址。

优势：

* 防盗链
* 加速缓存
* 统一入口

---

# 10. 删除系统

接口：

```
DELETE

/api/delete/{id}
```

流程：

```
管理员验证

↓

Drive删除

↓

刷新页面
```

游客：

返回：

```json
{
error:
"游客禁止删除"
}
```

---

# 11. 分享功能

接口：

```
/api/share/{id}
```

生成：

```
/share/{id}
```

分享页面：

黑色背景

居中显示图片。

---

# 12. 前端结构

首页：

```
homePage(admin)
```

包含：

## Header

标题：

```
📷 Photos
```

## Gallery

照片墙：

```css
.gallery
```

## Viewer

全屏查看：

功能：

* 上一张
* 下一张
* 双击缩放
* 分享
* 删除

---

# 13. 缩略图调整

桌面：

```css
.gallery{

grid-template-columns:
repeat(6,1fr);

}
```

手机：

```css
@media(max-width:800px)
```

推荐：

```
电脑 6列

手机 4列
```

---

# 14. Google Drive 权限

上传后：

自动设置：

```javascript
type:"anyone"

role:"reader"
```

因此：

图片可以公开访问。

---

# 15. 收藏系统

数据文件：

```
photos_favorites.json
```

保存：

```json
{
favorites:[
"id1",
"id2"
]
}
```

---

# 16. AI 扩展接口

预留：

```
/api/ai/tag

/api/ai/face
```

未来支持：

* 人脸识别
* 自动分类
* 地点识别
* 智能相册

---

# 17. 常见错误

## 1. 首页显示：

```
加载中...
```

原因：

JavaScript 语法错误。

检查：

浏览器 Console。

---

## 2. 上传按钮无反应

检查：

```javascript
ADMIN=true
```

检查：

```html
id="uploadBtn"
```

---

## 3. missing ) after argument list

原因：

Worker HTML 模板字符串被破坏。

避免：

在 `<script>` 内使用：

```javascript
`
```

反引号。

---

## 4. 上传完成窗口不关闭

检查：

```javascript
checkUploadFinish()
```

---

# 18. 后续升级计划

## v5.4.2

完成：

✅ 上传队列
✅ 多图上传
✅ 进度显示

---

## v5.5

计划：

* EXIF 时间轴优化
* 相册分类
* 收藏页面
* 删除回收站

---

## v6.0

计划：

* AI 人脸识别
* 智能搜索
* 地图照片
* 家庭共享

---

# 19. 维护建议

修改前：

备份：

```
worker.js
```

测试顺序：

1. 游客访问
2. 管理员登录
3. 上传单图
4. 上传多图
5. 删除照片
6. 分享链接

---

# 项目状态

当前版本：

```
Apple Photos v5.4.1 Final
```

稳定功能：

✅ 私人云相册
✅ Google Drive 存储
✅ 管理员控制
✅ 多图上传队列
✅ 移动端适配

---
### 特别注意
上传照片会读取：

✅ 拍摄时间
✅ GPS（如果存在）
✅ 相机型号

不喜勿用！！！
这份可以作为项目 README / 维护手册使用。你后续升级到 v5.5、v6.0 可以继续在这个文档基础上扩展。
