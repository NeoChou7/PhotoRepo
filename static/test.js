'use strict';

const serverHostPath = "http://localhost:8080";

const dialogTmp = `<div class='fullscreen dialog' display='none' ontouched='cancelDialog()' onclick='cancelDialog()'>
<button class='deleteBlockBtn' ontouched='deleteSelImg(event)' onclick='deleteSelImg(event)'>刪除</button>
<button class='cancleBlockBtn' ontouched='cancelDialog()' onclick='cancelDialog()'>取消</button>
</div>`

const fullImgTmp = `<div class='fullscreen fullImg'>
<div class='fullImgHeader'>
<span id='fullImgTitle'>幾張圖片</span><button class='closeIcon' onclick='closeFullImg()' ontouched=''closeFullImg()''>X</button>
</div>
<div class='fullImgContent'>
<img>
</div>
<div class='fullImgFooter'>照片資訊</div></div>`

const content = document.querySelector(".content");
const totalNum = document.getElementById("totalNum");
const selectBtn = document.getElementById("selectBtn");
const selectCount = document.getElementById("selectCount");
const fileUploader = document.querySelector('[data-target="file-uploader"]');
const selectItems = document.getElementsByClassName("selectItems")[0];
const trashCanBtn = document.getElementById("trashCanBtn");
var dialog = {}
var fullImgDiv = {}
// const queryBtn = document.getElementById("query");

fileUploader.addEventListener("change", function (e) {
  let arys = e.target.files;
  Array.from(e.target.files).forEach((name) => {

    wsFileUpload(name);
    // refresh()
  });

});

content.addEventListener('scroll', () => {
  if (content.offsetHeight + content.scrollTop >= content.scrollHeight) {
    console.log('scroll')
    loadImg(album[album.length - 1])
  }
})


selectBtn.onclick = selectClick;
trashCanBtn.onclick = clickTranshCan;
let album = [];
// let albumHtmlContext = {};
let deleteItems = [];
init();

function init() {
  //tmp
  let dialogElement = htmlToElement(dialogTmp)
  let fullImgElement = htmlToElement(fullImgTmp)

  document.querySelector('body').append(dialogElement)
  document.querySelector('body').append(fullImgElement)

  dialog = document.querySelector(".dialog");
  dialog.style.display = 'none'
  fullImgDiv = document.querySelector(".fullImg");
  fullImgDiv.style.display = 'none'
  //取得50張照片名稱
  wsGetImages()
    .then(function (jsonData) {
      for (var i in jsonData) {
        if (!jsonData.hasOwnProperty(i)) continue;
        // album[jsonData[i]] = ''
        album.push(jsonData[i])
      }
    })
    .then(function () {
      album = album.sort(function (a, b) {
        return a - b;
      })
      Promise.all(
        album.map(name => {
          return generateImgContext(name)
        })
      ).then(function (datas) {
        datas.map(obj => {
          content.innerHTML += obj;
        })
        totalNum.innerHTML = `${getTotalCount()}張照片`;
      });
    });

}
//捲動需要
function loadImg(fromName) {
  var addAlbum = []
  wsGetImages(fromName)
    .then(function (jsonData) {
      for (var i in jsonData) {
        if (!jsonData.hasOwnProperty(i)) continue;
        //取出
        addAlbum.push(jsonData[i])
        // if (!album.includes(jsonData[i])) {
        //   addAlbum.push(jsonData[i])
        // }
      }
    })
    .then(function () {
      addAlbum = addAlbum.sort(function (a, b) {
        return a - b;
      })
      Promise.all(
        addAlbum.map(name => {
          return generateImgContext(name)
        })
      ).then(function (datas) {
        datas.map(obj => {
          content.innerHTML += obj;
        })
        album = album.concat(addAlbum)
        totalNum.innerHTML = `${getTotalCount()}張照片`;
      });
    });
}
// //新增需要
// //兩種方式
// //一。全部刷新，重新撈資料，縮圖流量少，程式碼簡單
// //二。舊資料存下來，比較是否有新圖片，有則找地方insert，減少圖片傳輸數據
// ////algorithm1
// ////取得要刷新的範圍圖片
// ////比較哪些圖是新增的
// newAlbum [7,6,5,5,4,3,3,2,1]
// album [5,4,3,3,2,1]
// if newAlbum[i 0]>album[j 0]
//   needDownLoad.push(newAlbum[i])
//   location.push(album[j])
//   i++
//   continue
//   if newAlbum[i 0]=album[j 0]
//   i++,j++
//   continue
// ////撈圖片資料回來
// ////insert適當位置
//  撈回來的圖片不知道要放在哪個位置
//   排序的時候紀錄
//   name=location[0]
//   contentHtml=htmlStr[0]
//   foreach location
//     if(name != location ){
//       抓querySelector(name)
//       insert before innerHTML+= contentHtml
//       name=location
//       contentHtml=htmlStr
//     }
//     //抓querySelector (若遇到同時段照片此段會一直重複)
//     contentHtml+=[抓回來的資料]

//   做最後一次insert

// ////algorithm2
// ////取得要刷新的範圍圖片
// ////比較哪些圖是新增的
// newAlbum [7,6,5,5,4,3,3,2,1]
// album [5,4,3,3,2,1]

// if newAlbum[i 0]>album[j 0]
//  newAlbum[0] 是新增
//  撈資料，放到node
//   可根據陣列指定位置
//   可根據album檔名往前安插 album[j].before insert
//   撈資料會遇到非同步問題（除非能卡住此段)
// //////撈圖片資料回來
// //////insert適當位置


async function getRangeImgNames(oldestName) {
  if (oldestName === undefined) return []
  var lastName = ''
  var newAlbum = []
  do {
    await wsGetImages(lastName)
      .then(function (jsonData) {
        jsonData.map(v => newAlbum.push(v))
        newAlbum = newAlbum.sort(function (a, b) {
          return a - b;
        })
        lastName = newAlbum.slice(-1)[0]
      })
  } while (lastName > oldestName);
  return newAlbum
}
//startName 第一張
function refresh() {
  //取出最畫面上舊的一張
  let oldestName = album.slice(-1)[0];
  getRangeImgNames(oldestName).then(function (newAlbum) {
    // newAlbum 是否需要重新排序
    newAlbum = newAlbum.sort(function (a, b) {
      return a - b;
    })
    // 比較哪些圖是新增的
    var needDownLoad = []
    var insertLocation = []
    // newAlbum [7,6,5,5,4,3,3,2,1,1]
    // album [5,4,3,3,2,1]
    var i = 0
    var j = 0
    while (i < newAlbum.length) {
      if (newAlbum[i] > album[j]) {
        needDownLoad.push(newAlbum[i])
        insertLocation.push(album[j])
        album.splice(j, 0, newAlbum[i])
        i++
        j = j < album.length - 1 ? j + 1 : album.length - 1
        continue
      }
      if (newAlbum[i] === album[j]) {
        i++
        j = j < album.length - 1 ? j + 1 : album.length - 1
        continue
      }
      if (newAlbum[i] < album[j]) {
        needDownLoad.push(newAlbum[i])
        insertLocation.push(undefined)
        i++
        continue
      }
    }

    console.log(newAlbum)
    console.log(album)

    // album = album.sort(function (a, b) {
    //   return a - b;
    // })
    // needDownLoad = needDownLoad.sort(function (a, b) {
    //   return a - b;
    // })

    if (needDownLoad.length == 0) return;

    Promise.all(
      needDownLoad.map(name => {
        return generateImgContext(name)
      })
    ).then(function (datas) {

      var locationName = insertLocation.shift()
      var contentHtml = []
      contentHtml[0] = datas.shift()
      for (var index in insertLocation) {
        if (!insertLocation.hasOwnProperty(index)) continue;
        if (locationName !== insertLocation[index]) {
          var existNode = content.querySelector('[name="' + locationName + '"]')
          //foreach 
          contentHtml.map(html => {
            var htmlnode = htmlToElement(html)
            content.insertBefore(htmlnode, existNode.parentElement)
          })
          locationName = insertLocation[index]
          contentHtml = []
          contentHtml[0] = datas[index]
        }
        contentHtml.push(datas[index])
      }
      // 做最後一次insert
      if (locationName === undefined) {
        contentHtml.map(obj => {
          content.innerHTML += obj;
        })
      } else {
        existNode = content.querySelector('[name="' + locationName + '"]')
        contentHtml.map(html => {
          content.insertBefore(htmlToElement(html), existNode.parentElement)
        })
      }
      totalNum.innerHTML = `${getTotalCount()}張照片`;
    });

  })

}
//click function
function selectClick(e) {
  deleteItems = [];
  this.innerText = this.innerText === "選取" ? "取消" : "選取";
  //下方刪除匯出視窗出現

  selectItems && selectItems.classList.contains("hidden") ?
    selectItems.classList.remove("hidden") :
    selectItems.classList.add("hidden");

  //讓照片的mask顯現
  let ma = document.querySelectorAll("[mask]");
  for (const m of ma) {
    m.style.visibility =
      m.style.visibility === "visible" ? "hidden" : "visible";
    m.classList.remove("deleteClick");
  }
  selectCount.innerHTML = `已選取${deleteItems.length}張照片`;
}

function selectImg(event) {
  event.preventDefault()
  let element = event.target
  if (deleteItems.includes(element.parentElement)) {
    deleteItems.remove(element.parentElement);
    element.classList.remove("deleteClick");
  } else {
    deleteItems.push(element.parentElement);
    element.classList.add("deleteClick");
  }
  selectCount.innerHTML = `已選取${deleteItems.length}張照片`;

}

function clickTranshCan() {
  //顯示刪除，取消按鈕 (全螢幕遮罩)
  dialog.style.display = 'block'
}

function cancelDialog() {
  event.preventDefault()
  dialog.style.display = 'none'
}

function deleteSelImg(event) {
  event.preventDefault()
  //取出刪除陣列
  let deleteNames = deleteItems.map((ele) =>
    ele.querySelector("[mask]").getAttribute("name")
  );
  wsDeleteImages(deleteNames).then((data) => {
    console.log(data);
    // ws if(刪除成功)
    deleteItems.map((ele) => {
      let name = ele.querySelector("[mask]").getAttribute("name")
      if (data[name]) {
        content.removeChild(ele);
        album.remove(name)
      }
    });
    deleteItems = [];

    // ws if 刪除失敗
    // selectBtn.click()
    totalNum.innerHTML = `${content.querySelectorAll('.minDiv').length}張照片`;
    selectCount.innerHTML = `已選取${deleteItems.length}張照片`;
  });
}

function fullImg() {
  event.preventDefault()
  fullImgDiv.style.display = 'block'
  let name = event.target.getAttribute('name')
  const imagePath = serverHostPath + "/image/" + name;
  fullImgDiv.querySelector('img').setAttribute('src', imagePath)
  // fullImgDiv.querySelector('#fullImgTitle').innerHTML = `/${getTotalCount()}`
  let index = album.indexOf(name) + 1
  fullImgDiv.querySelector('#fullImgTitle').innerHTML = `${index}/${album.length}`
  fullImgDiv.querySelector('.fullImgFooter').innerHTML = nameToDate(name)


}

function closeFullImg() {
  event.preventDefault()
  fullImgDiv.style.display = 'none'
}

function generateImgContext(imgName) {
  return wsGetXSImage(imgName)
    .then(function (imgData) {
      let imgTeplate = `<div class='minDiv'>
      <img src = ${imgData} class='minImg' ontouchend ='fullImg()' onclick='fullImg()' name='${imgName}'></img>
      <div  class='minImg' style='visibility: hidden;' mask ontouchend ='selectImg(event)' onclick='selectImg(event)' name='${imgName}'>
      <div class='tickImg'></div>
      </div>
    </div>`;
      return imgTeplate
    });
}
//=========computed
function getTotalCount() {
  return album.length
}

function dateFormate(dateStr, beforeFormate, afterFormate) {

}

function nameToDate(name) {
  let year = name.slice(0, 4)
  let month = name.slice(4, 6)
  let day = name.slice(6, 8)
  let hour = name.slice(8, 10)
  let min = name.slice(10, 12)
  return year + '/' + month + '/' + day + ' ' + hour + ':' + min
}
//=========
function wsGetImages(fromName) {
  const imagesPath =
    serverHostPath + "/images?fromName=" + (fromName ? fromName : "");
  return fetch(imagesPath).then(function (response) {
    return response.json();
  });
}

function wsDeleteImages(names) {
  const deletePath = serverHostPath + "/delete";

  return fetch(deletePath, {
    headers: {
      "content-type": "application/json",
    },
    method: "DELETE",
    body: JSON.stringify(names),
  }).then(function (response) {
    return response.json();
  });
}

function wsGetImage(imgName) {
  const imagePath = serverHostPath + "/image/" + imgName;
  return fetch(imagePath)
    .then(function (response) {
      return response.arrayBuffer();
      //   return response.formData();
    })
    .then(function (buffer) {
      var base64Flag = "data:image/jpeg;base64,";
      var imageStr = arrayBufferToBase64(buffer);
      return base64Flag + imageStr;
      // document.getElementById("img").src = base64Flag + imageStr;
    });
}

function wsGetXSImage(imgName) {
  const imagePath = serverHostPath + "/image-xs/" + imgName;
  return fetch(imagePath)
    .then(function (response) {
      return response.arrayBuffer();
      //   return response.formData();
    })
    .then(function (buffer) {
      var base64Flag = "data:image/jpeg;base64,";
      var imageStr = arrayBufferToBase64(buffer);
      return base64Flag + imageStr;
    });
}

function arrayBufferToBase64(buffer) {
  var binary = "";
  var bytes = [].slice.call(new Uint8Array(buffer));

  bytes.forEach((b) => (binary += String.fromCharCode(b)));

  return window.btoa(binary);
}

function wsFileUpload(file) {
  var data = new FormData();
  data.append("files", file);
  const uploadPath = serverHostPath + "/upload";
  fetch(uploadPath, {
    method: "POST",
    body: data,
  }).then(function (data) {
    if (data.ok) {}
    refresh()
  });
}


//=========
Array.prototype.remove = function (value) {
  const index = this.indexOf(value);
  if (index > -1) {
    return this.splice(index, 1);
  }
  return this;
};

function htmlToElement(html) {
  var template = document.createElement('template');
  html = html.trim(); // Never return a text node of whitespace as the result
  template.innerHTML = html;
  console.log(template.content)
  return template.content.firstChild;
}

function createElementFromHTML(htmlString) {
  var div = document.createElement('div');
  div.innerHTML = htmlString.trim();

  // Change this to div.childNodes to support multiple top-level nodes
  return div.firstChild;
}
// function getArrayBuffer(fileObj) {
//   return new Promise((resolve, reject) => {
//     const reader = new FileReader();
//     // Get ArrayBuffer when FileReader on load
//     reader.addEventListener("load", () => {
//       resolve(reader.result);
//     });

//     // Get Error when FileReader on error
//     reader.addEventListener("error", () => {
//       reject("error occurred in getArrayBuffer");
//     });

//     // read the blob object as ArrayBuffer
//     // if you nedd Base64, use reader.readAsDataURL
//     reader.readAsArrayBuffer(fileObj);
//   });
// }

// function uploadFileAJAX(arrayBuffer) {
//   // correct it to your own API endpoint
//   return fetch("http://localhost:8080/upload", {
//     headers: {
//       "content-type": "application/json",
//     },
//     method: "POST",
//     body: JSON.stringify({
//       files: Array.from(new Uint8Array(arrayBuffer)),
//     }),
//   })
//     .then((res) => {
//       if (!res.ok) {
//         throw res.statusText;
//       }
//       return res.json();
//     })
//     .then((data) => data)
//     .catch((err) => console.log("err", err));
// }