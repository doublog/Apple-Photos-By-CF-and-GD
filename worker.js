/*
====================================================
 Apple Photos v5.5.1 Drive Cache

 worker.js

 Part 1/4

 Backend Core

 Features:
 - Google Drive OAuth
 - Upload
 - Delete
 - List
 - Image Proxy
 - Favorites
 - AI Placeholder

 Cloudflare Worker Ready
====================================================
*/


const CONFIG = {


CLIENT_ID:"",

CLIENT_SECRET:"",

REFRESH_TOKEN:"",


DRIVE_FOLDER_ID:

"1BNwCgaQ5MyzHYmXO-UiXsC4YtL3qlzpr",


ADMIN_KEY:"",


FAVORITE_FILE:

"photos_favorites.json",


AI_FILE:

"photos_ai.json",


COOKIE_NAME:

"photos_admin"


};



const DRIVE_API =

"https://www.googleapis.com/drive/v3/files";


const DRIVE_UPLOAD =

"https://www.googleapis.com/upload/drive/v3/files";


const TOKEN_URL =

"https://oauth2.googleapis.com/token";



let TOKEN_CACHE=null;





/*
====================================================
 Google OAuth Token
====================================================
*/


async function getAccessToken(){


if(

TOKEN_CACHE &&

TOKEN_CACHE.expire >

Date.now()

){

return TOKEN_CACHE.token;

}



const body =

new URLSearchParams();



body.set(

"client_id",

CONFIG.CLIENT_ID

);


body.set(

"client_secret",

CONFIG.CLIENT_SECRET

);


body.set(

"refresh_token",

CONFIG.REFRESH_TOKEN

);


body.set(

"grant_type",

"refresh_token"

);




const res =

await fetch(

TOKEN_URL,

{

method:"POST",

headers:{

"Content-Type":

"application/x-www-form-urlencoded"

},

body

}

);




if(!res.ok){

throw new Error(

await res.text()

);

}




const data =

await res.json();





TOKEN_CACHE={


token:

data.access_token,


expire:

Date.now()

+

(data.expires_in-60)

*

1000


};




return data.access_token;


}







/*
====================================================
 Drive Request
====================================================
*/


async function driveRequest(

url,

options={}

){


const token =

await getAccessToken();




const headers =

new Headers(

options.headers || {}

);



headers.set(

"Authorization",

"Bearer "+token

);




return fetch(

url,

{

...options,

headers

}

);



}







/*
====================================================
 Find Drive File
====================================================
*/


async function findDriveFile(name){


const url =

new URL(

DRIVE_API

);



url.searchParams.set(

"q",

"name='"+name+"' and trashed=false"

);



url.searchParams.set(

"fields",

"files(id,name)"

);



const res =

await driveRequest(

url

);



const data =

await res.json();



return data.files?.[0] || null;


}








/*
====================================================
 Upload Drive File

 Multipart Upload

====================================================
*/


async function uploadDriveFile(

file,

filename

){



const token =

await getAccessToken();




const boundary =

"apple_photos_v541";



const mime =

file.type ||

"image/jpeg";




const metadata =

JSON.stringify({

name:

filename ||

file.name ||

"photo.jpg",


mimeType:mime,


parents:[

CONFIG.DRIVE_FOLDER_ID

]


});






const body =

new Blob(

[

"--"+boundary+"\r\n",

"Content-Type: application/json; charset=UTF-8\r\n\r\n",

metadata,


"\r\n--"+boundary+"\r\n",

"Content-Type:"+mime+"\r\n\r\n",

file,


"\r\n--"+boundary+"--"


],

{

type:

"multipart/related; boundary="+boundary

}

);






const res =

await fetch(

DRIVE_UPLOAD+

"?uploadType=multipart",

{

method:"POST",

headers:{


"Authorization":

"Bearer "+token,


"Content-Type":

"multipart/related; boundary="+boundary


},

body

}

);





if(!res.ok){


throw new Error(

await res.text()

);


}




const result =

await res.json();





// public read


await driveRequest(

DRIVE_API+

"/"+

result.id+

"/permissions",

{

method:"POST",

headers:{

"Content-Type":

"application/json"

},

body:

JSON.stringify({

type:"anyone",

role:"reader"

})

}

);


await clearDriveCache();



return result;


}

async function clearDriveCache(){


if(
ENV &&
ENV.PHOTO_CACHE
){

await ENV.PHOTO_CACHE.delete(
CACHE_KEY
);

}


}




/*
====================================================
 Delete Drive File
====================================================
*/


async function deleteDriveFile(id){



const res =

await driveRequest(

DRIVE_API+"/"+id,

{

method:"DELETE"

}

);





if(

!res.ok &&

res.status!==204

){

throw new Error(

await res.text()

);

}

await clearDriveCache();


return true;


}







/*
====================================================
 List Photos
====================================================
*/


async function listDriveFiles(){


let files=[];


let pageToken="";



do{


const url =

new URL(

DRIVE_API

);



url.searchParams.set(

"pageSize",

"100"

);



url.searchParams.set(

"fields",

"nextPageToken,files(id,name,mimeType,createdTime,imageMediaMetadata)"

);



url.searchParams.set(

"q",

"mimeType contains 'image' and trashed=false"

);




if(pageToken){


url.searchParams.set(

"pageToken",

pageToken

);


}





const res =

await driveRequest(

url

);




const data =

await res.json();




files.push(

...(data.files || [])

);



pageToken =

data.nextPageToken || "";




}

while(pageToken);



return files;


}

/*
=================================
 Drive Cache v5.5.1
=================================
*/


const CACHE_KEY =
"photos_drive_list_v551";



async function getCachedDriveFiles(){


if(
!globalThis.ENV ||
!globalThis.ENV.PHOTO_CACHE
){

return null;

}



const cache =
await ENV.PHOTO_CACHE.get(
CACHE_KEY,
"json"
);



return cache || null;


}




async function setCachedDriveFiles(files){



if(
!globalThis.ENV ||
!globalThis.ENV.PHOTO_CACHE
){

return;

}



await ENV.PHOTO_CACHE.put(

CACHE_KEY,

JSON.stringify(files),

{

expirationTtl:300

}

);


}







async function getDriveFilesFast(){



// 读取缓存

const cache =
await getCachedDriveFiles();



if(cache){


console.log(
"Drive Cache HIT"
);


return cache;


}




console.log(
"Drive Cache MISS"
);




// 查询Google Drive

const files =
await listDriveFiles();




// 写缓存

await setCachedDriveFiles(
files
);



return files;



}

/*
====================================================
 EXIF Date Parser
====================================================
*/

function parsePhotoDate(date){


    if(!date){

        return new Date(0);

    }


    if(
        typeof date==="string" &&
        /^\d{4}:\d{2}:\d{2}/.test(date)
    ){


        const p =
        date.split(/[: ]/);


        return new Date(
            `${p[0]}-${p[1]}-${p[2]}T${p[3]}:${p[4]}:${p[5]}`
        );


    }


    const d =
    new Date(date);



    return isNaN(d.getTime())

    ?

    new Date(0)

    :

    d;


}




/*
====================================================
 Image Proxy
====================================================
*/


async function imageProxy(id){


const res =

await driveRequest(

DRIVE_API+

"/"+

id+

"?alt=media"

);




if(!res.ok){


return new Response(

"Not Found",

{

status:404

}

);


}





return new Response(

res.body,

{

headers:{

"Content-Type":

res.headers.get(

"Content-Type"

)

||

"image/jpeg",


"Cache-Control":

"public,max-age=2592000,immutable"


}

}

);


}
/*
====================================================
 Favorites Storage
====================================================
*/


async function getFavorites(){


const file =

await findDriveFile(

CONFIG.FAVORITE_FILE

);



if(!file){

return [];

}



const res =

await driveRequest(

DRIVE_API+

"/"+

file.id+

"?alt=media"

);



const data =

await res.json();



return data.favorites || [];


}






async function saveFavorites(list){



const body =

JSON.stringify({

favorites:list

});



const old =

await findDriveFile(

CONFIG.FAVORITE_FILE

);




if(old){


return driveRequest(

DRIVE_API+

"/"+

old.id,

{

method:"PATCH",

headers:{

"Content-Type":

"application/json"

},

body

}

);



}



return uploadDriveFile(

new Blob(

[body],

{

type:"application/json"

}

),

CONFIG.FAVORITE_FILE

);



}








/*
====================================================
 AI Metadata Storage Placeholder
====================================================

 Future:

 - Face Recognition
 - Object Detection
 - Location
 - Smart Album

====================================================
*/


async function getAIData(){



const file =

await findDriveFile(

CONFIG.AI_FILE

);



if(!file){

return {};

}



const res =

await driveRequest(

DRIVE_API+

"/"+

file.id+

"?alt=media"

);



return await res.json();



}






async function saveAIData(data){



const body =

JSON.stringify(data);



const file =

await findDriveFile(

CONFIG.AI_FILE

);



if(file){



return driveRequest(

DRIVE_API+

"/"+

file.id,

{

method:"PATCH",

headers:{

"Content-Type":

"application/json"

},

body

}

);



}




return uploadDriveFile(

new Blob(

[body],

{

type:"application/json"

}

),

CONFIG.AI_FILE

);



}







/*
====================================================
 Admin Cookie
====================================================
*/


function isAdmin(request){

const cookie =
request.headers.get("Cookie") || "";


return cookie
.split(";")
.map(v=>v.trim())
.includes(
CONFIG.COOKIE_NAME+
"="+
CONFIG.ADMIN_KEY
);

}







function adminCookie(){


return {

"Set-Cookie":

CONFIG.COOKIE_NAME+

"="+

CONFIG.ADMIN_KEY+

"; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400"

};


}






function clearCookie(){


return {

"Set-Cookie":

CONFIG.COOKIE_NAME+

"=; Path=/; Max-Age=0"

};


}







/*
====================================================
 Admin Login
====================================================
*/


async function adminLogin(request){

const form = await request.formData();

const key =
(form.get("key") || "").trim();

console.log(
"LOGIN:",
key,
CONFIG.ADMIN_KEY
);


if(!key || key!==CONFIG.ADMIN_KEY){

return new Response(
"密码错误",
{
status:401,
headers:{
"Content-Type":"text/plain;charset=UTF-8"
}
}
);

}


return new Response(null,{
status:302,
headers:{
"Location":"/",
"Set-Cookie":
CONFIG.COOKIE_NAME+
"="+
CONFIG.ADMIN_KEY+
"; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400"
}
});


}







/*
====================================================
 Photo List API
====================================================
*/


async function pageApi(request){


const url =
new URL(request.url);



const page =
Number(
url.searchParams.get("page")
||1
);



const size =
100;



let files =
await getDriveFilesFast();




// 按日期排序

files.sort(
(a,b)=>{


const dateA =
parsePhotoDate(
a.imageMediaMetadata?.time ||
a.createdTime
);


const dateB =
parsePhotoDate(
b.imageMediaMetadata?.time ||
b.createdTime
);



return dateB-dateA;


});





const start =
(page-1)*size;


const end =
start+size;



const result =
files.slice(
start,
end
);



return Response.json({


page,


size,


total:
files.length,



hasMore:
end < files.length,



files:

result.map(file=>({


id:file.id,


name:file.name,


mimeType:file.mimeType,


createdTime:
file.createdTime,



photoTime:

file.imageMediaMetadata?.time
||
file.createdTime,



url:

new URL(
"/file/"+file.id,
request.url
).toString()



}))



});


}







/*
====================================================
 Share API
====================================================
*/


async function shareApi(

id,

request

){


return Response.json({

success:true,


url:

new URL(

"/share/"+id,

request.url

).toString()



});


}







/*
====================================================
 Share Page
====================================================
*/


function sharePage(id){



return new Response(

`

<!DOCTYPE html>

<html>

<head>

<meta name="viewport"

content="width=device-width,initial-scale=1">


<title>

Photo

</title>


<style>

html,body{

margin:0;

height:100%;

background:#000;

display:flex;

align-items:center;

justify-content:center;

}


img{

max-width:100%;

max-height:100%;

object-fit:contain;

}

</style>


</head>



<body>


<img src="/file/${id}">


</body>


</html>


`,

{

headers:{

"Content-Type":

"text/html;charset=UTF-8"

}

}


);



}







/*
====================================================
 Album Share
====================================================
*/


function albumSharePage(ids){



const html =

ids.map(

id=>

`

<img

src="/file/${id}"

style="width:100%">

`

)

.join("");




return new Response(

`

<html>

<body style="

background:black;

display:grid;

grid-template-columns:repeat(2,1fr);

gap:5px;

">

${html}

</body>

</html>

`,

{

headers:{

"Content-Type":

"text/html"

}

}

);


}







/*
====================================================
 JSON Error
====================================================
*/


function jsonError(

msg,

status=400

){


return Response.json(

{

error:msg

},

{

status

}

);


}







/*
====================================================
 CORS
====================================================
*/


function cors(){


return {

"Access-Control-Allow-Origin":"*",


"Access-Control-Allow-Methods":

"GET,POST,DELETE,OPTIONS",


"Access-Control-Allow-Headers":"*"


};


}
/*
====================================================
 Apple Photos UI

 Part 3/4

====================================================
*/


function homePage(admin){



return new Response(

`

<!DOCTYPE html>

<html>

<head>


<meta charset="UTF-8">


<meta name="viewport"

content="width=device-width,initial-scale=1,viewport-fit=cover">


<meta name="apple-mobile-web-app-capable"

content="yes">


<meta name="apple-mobile-web-app-status-bar-style"

content="black-translucent">

<meta name="mobile-web-app-capable" content="yes">

<title>

MyLife Photos

</title>



<style>


*{

box-sizing:border-box;

}



body{

margin:0;

padding:

env(safe-area-inset-top)

18px

calc(90px + env(safe-area-inset-bottom));


background:#f5f5f7;


font-family:

-apple-system,

BlinkMacSystemFont,

Arial;

}



.header{

display:flex;

justify-content:space-between;

align-items:center;

}



.title{

font-size:38px;

font-weight:700;

}



.gallery{

display:grid;

grid-template-columns:

repeat(6,1fr);

gap:5px;

margin-top:20px;

}

@media(max-width:800px){

.gallery{

grid-template-columns:

repeat(4,1fr);

gap:4px;

}

}

.photo{

overflow:hidden;

border-radius:15px;

background:#ddd;

}


.photo img{

width:100%;

aspect-ratio:1;

object-fit:cover;

display:block;

border-radius:15px;

}



.yearTitle{

font-size:28px;

font-weight:700;

margin-top:30px;

}



.monthTitle{

color:#777;

margin:10px 0;

}





.viewer{

position:fixed;

inset:0;

background:#000;


display:none;


align-items:center;

justify-content:center;


z-index:9999;


touch-action:none;

}



.viewer img{

width:100%;

height:100%;

max-width:100%;

max-height:100%;

object-fit:contain;

transition:

transform .25s ease;

user-select:none;

-webkit-user-drag:none;

}



.viewer.zoom img{

transform:scale(2);

}



.viewer button{

position:absolute;


width:55px;

height:55px;


border-radius:50%;


border:0;


background:#ffffff55;


color:white;


font-size:28px;

}



#closeBtn{

top:30px;

right:20px;

}



#prevBtn{

left:20px;

top:50%;

}



#nextBtn{

right:20px;

top:50%;

}



#shareBtn{

bottom:40px;

left:30px;

}



#deleteBtn{

bottom:40px;

right:30px;

}



.bottom{

position:fixed;

left:0;

right:0;

bottom:0;


height:75px;


background:#ffffffdd;


backdrop-filter:

blur(20px);


display:flex;


justify-content:center;


align-items:center;

}



#uploadPanel{

display:none;

position:fixed;

left:20px;

right:20px;

bottom:90px;

background:white;

border-radius:25px;

padding:20px;

z-index:5000;

box-shadow:
0 10px 40px #0003;

}


.queue{

margin-top:10px;

}



.queue img{

width:50px;

height:50px;


border-radius:12px;

object-fit:cover;

}


</style>


</head>



<body>



<div class="header">


<div class="title">

📷 MyLife Photos

</div>


<div id="count">

</div>


</div>




<div id="content">

加载中...

</div>




${admin ? `

<div id="uploadPanel">


<input

id="fileInput"

type="file"

multiple

accept="image/*">


<div id="queue"></div>


</div>

`:""}





<div id="viewer"

class="viewer">



<button id="closeBtn">

×

</button>



<button id="prevBtn">

‹

</button>



<img id="big">



<button id="nextBtn">

›

</button>




<button id="shareBtn">

🔗

</button>



${admin?`

<button id="deleteBtn">

🗑

</button>

`:''}



</div>





<div class="bottom">


📷 照片


${admin?
`
<button id="uploadBtn"
style="
border:0;
background:none;
font-size:16px;
">
☁️ 上传
</button>
`
:''}


</div>







<script>


const ADMIN=${admin};



let photos=[];

let page=1;

let loading=false;

let hasMore=true;

let current=0;

let startX=0;

let zoom=false;


// ===============================
// EXIF 日期解析
// ===============================

function parsePhotoDate(date){


    if(!date){
        return new Date();
    }


    // Google EXIF格式
    // 2022:05:03 14:14:48

    if(
        typeof date === "string" &&
        date.length >= 19 &&
        date[4] === ":" &&
        date[7] === ":"
    ){

        const year =
        Number(date.substring(0,4));

        const month =
        Number(date.substring(5,7))-1;

        const day =
        Number(date.substring(8,10));

        const hour =
        Number(date.substring(11,13));

        const minute =
        Number(date.substring(14,16));

        const second =
        Number(date.substring(17,19));


        return new Date(
            year,
            month,
            day,
            hour,
            minute,
            second
        );

    }



    const d =
    new Date(date);



    if(
        isNaN(d.getTime())
    ){

        return new Date();

    }


    return d;

}

const content=document.getElementById(

"content"

);



const viewer=document.getElementById(

"viewer"

);



const big=document.getElementById(

"big"

);





async function loadPhotos(reset=false){


if(loading)
return;


if(!hasMore && !reset)
return;



loading=true;



if(reset){

page=1;

photos=[];

hasMore=true;

content.innerHTML="";

}



const res =
await fetch(
"/api/page?page="+page
);



const data =
await res.json();



photos.push(
...(data.files||[])
);



hasMore =
data.hasMore;



page++;



document.getElementById(
"count"
).innerHTML =
data.total+" 张";



render();



loading=false;


}







function render(){

console.log("photos:",photos.length);


content.innerHTML="";


let groups={};


photos.forEach(p=>{

console.log("photo:",p.photoTime,p.createdTime);

console.log(groups);

const test =
parsePhotoDate(
p.photoTime || p.createdTime
);

console.log("date:",test);

const d =
parsePhotoDate(
p.photoTime || p.createdTime
);



if(!d || isNaN(d.getTime())){

return;

}


const y =
d.getFullYear();


const m =
d.getMonth()+1;



if(!groups[y]){

groups[y]={};

}



if(!groups[y][m]){

groups[y][m]=[];

}



groups[y][m].push(p);



});



Object.keys(groups)

.sort((a,b)=>b-a)

.forEach(y=>{


const year =
document.createElement("div");


year.className="yearTitle";


year.innerHTML =
y+"年";


content.appendChild(year);





Object.keys(groups[y])

.sort((a,b)=>b-a)

.forEach(m=>{


const month =
document.createElement("div");


month.className="monthTitle";


month.innerHTML =
m+"月";


content.appendChild(month);





const grid =
document.createElement("div");


grid.className="gallery";





groups[y][m].forEach(p=>{


const box =
document.createElement("div");


box.className="photo";



const img =
document.createElement("img");


img.loading="lazy";


img.src=p.url;



box.appendChild(img);



box.onclick=()=>{


current =
photos.indexOf(p);


showPhoto();


viewer.style.display="flex";


};



grid.appendChild(box);



});



content.appendChild(grid);



});


});


}







function showPhoto(){


if(!photos[current])

return;



big.src=

photos[current].url;


}





document.getElementById(

"closeBtn"

).onclick=()=>{


zoom=false;

viewer.classList.remove(
"zoom"
);


big.style.transform="";


viewer.style.display="none";


};






document.getElementById(

"prevBtn"

).onclick=()=>{


current--;


if(current<0)

current=

photos.length-1;



showPhoto();



};






document.getElementById(

"nextBtn"

).onclick=()=>{


current++;


if(current>=photos.length)

current=0;



showPhoto();



};








big.addEventListener(

"touchstart",

e=>{


startX=

e.touches[0].clientX;



},

{

passive:true

}

);





big.addEventListener(

"touchend",

e=>{


const diff=

e.changedTouches[0].clientX

-

startX;




if(Math.abs(diff)<50)

return;



if(diff>0)

current--;

else

current++;




if(current<0)

current=

photos.length-1;



if(current>=photos.length)

current=0;



showPhoto();



},

{

passive:true

}

);







big.addEventListener(

"dblclick",

()=>{


zoom=!zoom;


viewer.classList.toggle(

"zoom",

zoom

);


}

);








if(ADMIN){



document.getElementById(

"deleteBtn"

).onclick=

async()=>{


if(!confirm(

"删除照片?"

))

return;



await fetch(

"/api/delete/"+photos[current].id,

{

method:"DELETE"

}

);



viewer.style.display="none";


loadPhotos();



};



}




document.getElementById(

"shareBtn"

).onclick=

async()=>{


const res=

await fetch(

"/api/share/"+photos[current].id

);



const data=

await res.json();



if(navigator.share){


navigator.share({

title:"Photo",

url:data.url

});


}

else{


prompt(

"分享链接",

data.url

);


}


};






loadPhotos();

window.addEventListener(
"scroll",
()=>{


if(
window.innerHeight+
window.scrollY
>=
document.body.offsetHeight-500
){


loadPhotos();


}


});

if(ADMIN){


const fileInput =
document.getElementById(
"fileInput"
);


const queue =
document.getElementById(
"queue"
);


const uploadBtn =
document.getElementById(
"uploadBtn"
);


const panel =
document.getElementById(
"uploadPanel"
);



let uploadTasks=[];

let uploading=false;



// 打开上传面板

if(uploadBtn && panel){


uploadBtn.onclick=()=>{


panel.style.display =

panel.style.display==="block"

?

"none"

:

"block";


};


}







// 选择照片


if(fileInput){


fileInput.onchange=e=>{


const files =
Array.from(
e.target.files
);



files.forEach(file=>{


createUploadTask(file);


});



startQueue();



};


}







// 创建任务


function createUploadTask(file){



const task={


file:file,


status:"waiting",


progress:0,


row:null,


percent:null


};



uploadTasks.push(task);





const row =
document.createElement(
"div"
);



row.style.marginTop="12px";


row.style.padding="8px";


row.style.background="#f5f5f5";


row.style.borderRadius="12px";




row.innerHTML =

file.name +

"　等待";



queue.appendChild(row);



task.row=row;



}









// 开始队列


async function startQueue(){



if(uploading)

return;



const task =

uploadTasks.find(

x=>x.status==="waiting"

);



if(!task)

return;




uploading=true;



await uploadFile(task);



uploading=false;



startQueue();



}


function checkUploadFinish(){


const unfinished =

uploadTasks.some(

t=>

t.status==="waiting"

||

t.status==="uploading"

);



if(!unfinished){



setTimeout(()=>{


queue.innerHTML="";



if(panel){


panel.style.display="none";


}



uploadTasks=[];



},1200);



}



}






// 上传单个文件


function uploadFile(task){



return new Promise(resolve=>{



task.status="uploading";




const xhr =

new XMLHttpRequest();




const form =

new FormData();



form.append(

"file",

task.file

);




xhr.open(

"POST",

"/api/upload",

true

);



xhr.withCredentials=true;







task.row.innerHTML =

task.file.name +

"　上传 0%";





xhr.upload.onprogress=e=>{



if(e.lengthComputable){



const p =

Math.round(

e.loaded /

e.total *

100

);



task.progress=p;



task.row.innerHTML =

task.file.name +

"　上传 "

+

p

+

"%";



}



};









xhr.onload=()=>{



if(xhr.status===200){


task.status="done";


task.row.innerHTML =

task.file.name +

"　完成 ✓";


loadPhotos(true);


// 检查是否全部完成

checkUploadFinish();



}else{



task.status="error";


task.row.innerHTML =

task.file.name +

"　失败 ✕";



}



resolve();



};








xhr.onerror=()=>{



task.status="error";



task.row.innerHTML =

task.file.name +

"　网络错误";



resolve();



};






xhr.send(form);



});



}







}


</script>



</body>


</html>


`,

{

headers:{

"Content-Type":

"text/html;charset=UTF-8"

}

}

);


}




/*
====================================================
 Cloudflare Worker Router

 FINAL ENTRY

====================================================
*/


export default {


async fetch(
request,
env,
ctx
){

globalThis.ENV = env;

CONFIG.CLIENT_ID =
env.CLIENT_ID ||
CONFIG.CLIENT_ID;


CONFIG.CLIENT_SECRET =
env.CLIENT_SECRET ||
CONFIG.CLIENT_SECRET;


CONFIG.REFRESH_TOKEN =
env.REFRESH_TOKEN ||
CONFIG.REFRESH_TOKEN;


CONFIG.ADMIN_KEY =
env.ADMIN_KEY ||
CONFIG.ADMIN_KEY;





const url=
new URL(
request.url
);





/*
-----------------------------
 CORS
-----------------------------
*/


if(
request.method==="OPTIONS"
){

return new Response(
null,
{
headers:cors()
}
);

}


/*
====================================================
 Admin Login Page
====================================================
*/

function adminPage(){

return new Response(`

<!doctype html>

<html>

<head>

<meta name="viewport"
content="width=device-width,initial-scale=1">

<title>
Admin Login
</title>


<style>

body{

background:#f5f5f7;

font-family:-apple-system;

display:flex;

height:100vh;

align-items:center;

justify-content:center;

}


.box{

background:white;

padding:30px;

border-radius:20px;

box-shadow:0 10px 40px #0003;

}


input{

font-size:20px;

padding:12px;

border-radius:10px;

border:1px solid #ccc;

}


button{

margin-top:20px;

width:100%;

padding:12px;

border:0;

border-radius:12px;

background:#007aff;

color:white;

font-size:18px;

}

</style>


</head>


<body>


<div class="box">


<h2>
📷 Photos Admin
</h2>


<form method="POST"
action="/admin/login">


<input

type="password"

name="key"

placeholder="管理员密码"


>


<button>

登录

</button>


</form>


</div>


</body>


</html>


`,
{

headers:{

"Content-Type":
"text/html;charset=UTF-8"

}

}

);


}


/*
-----------------------------
 Home
-----------------------------
*/


if(
url.pathname==="/"
){

return homePage(
isAdmin(request)
);

}


/*
==============================
 ADMIN PAGE
==============================
*/


if(
url.pathname==="/admin"
&&
request.method==="GET"
){

return adminPage();

}

if(url.pathname==="/admin/logout"){

return new Response(null,{
status:302,
headers:{
"Location":"/",
"Set-Cookie":
CONFIG.COOKIE_NAME+
"=; Path=/; Max-Age=0"
}
});

}

/*
-----------------------------
 Admin Login
-----------------------------
*/


if(
url.pathname==="/admin/login"
&&
request.method==="POST"
)
{
return adminLogin(request);
}





/*
-----------------------------
 Photo API
-----------------------------
*/


if(

url.pathname==="/api/page"

){

try{


return await pageApi(
request
);


}

catch(e){

console.log("PAGE ERROR:",e);


return Response.json({

error:e.message,
stack:e.stack

},
{
status:500
});

}

}





/*
-----------------------------
 Upload
-----------------------------
*/


if(
url.pathname==="/api/upload"
&&
request.method==="POST"
){

if(!isAdmin(request)){
return jsonError(
"游客禁止上传",
403
);
}


try{

const form =
await request.formData();

const file =
form.get("file");


if(!file){

return jsonError(
"missing file"
);

}


const result =
await uploadDriveFile(
file,
file.name
);


return Response.json({
success:true,
file:result
});


}
catch(e){

return jsonError(
e.message,
500
);

}

}

/*
-----------------------------
 Delete
-----------------------------
*/


if(
url.pathname.startsWith("/api/delete/")
&&
request.method==="DELETE"
){


if(!isAdmin(request)){

return jsonError(
"游客禁止删除",
403
);

}


const id =
url.pathname.replace(
"/api/delete/",
""
);


await deleteDriveFile(id);


return Response.json({
success:true
});


}


/*
-----------------------------
 Image Proxy
-----------------------------
*/


if(

url.pathname.startsWith(
"/file/"
)

){


const id=
url.pathname.replace(
"/file/",
""
);



return imageProxy(
id
);


}






/*
-----------------------------
 Favorites
-----------------------------
*/


if(

url.pathname==="/api/favorites"

&&

request.method==="GET"

){


return Response.json({

favorites:
await getFavorites()

});


}




if(

url.pathname==="/api/favorites"

&&

request.method==="POST"

){


const data=
await request.json();



await saveFavorites(
data.favorites||[]
);



return Response.json({

success:true

});


}






/*
-----------------------------
 Share
-----------------------------
*/


if(

url.pathname.startsWith(
"/api/share/"
)

){


const id=
url.pathname.replace(
"/api/share/",
""
);



return shareApi(
id,
request
);


}




if(

url.pathname.startsWith(
"/share/"
)

){


const id=
url.pathname.replace(
"/share/",
""
);



return sharePage(
id
);


}







/*
-----------------------------
 AI Placeholder

 Future:
 Face
 Object
 Auto Album

-----------------------------
*/


if(

url.pathname==="/api/ai/tag"

){

return Response.json({

success:false,

message:
"AI module reserved"

});


}





if(

url.pathname==="/api/ai/face"

){

return Response.json({

success:false,

message:
"Face module reserved"

});


}







return new Response(

"Not Found",

{

status:404,

headers:cors()

}

);



}

};
