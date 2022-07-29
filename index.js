
const fs = require("fs")
var request = require('request')
const crypto = require('crypto');

var async = require('async');


let pathHead = "/apps/"
let inputPath = "1.txt"

let access_token = '121.243aaff966e07b0415b84ed5cbc230df.YaH98rpdBLTGv1DocL5UNviuOfneyHUB4dQiA-D.kBm_WQ'
let badiPath = ''

let maxSize = 4 * 1024 *1024



let fileInfo = {
    filePath: '',
    size: 0,
    md5_list: [],
    data_list: [],
    block_list: '',
}

// 预先上传的url参数
let precreateParam = {
    method: 'precreate',
    access_token: access_token,
    
}

let precreateBody = {
    path: badiPath,
    size: 0,
    isdir: 0,
    block_list: '',
    autoinit: 1,
    rtype: 0,
}

let precreateResponse = {
    errno: 0,
    path: '',
    uploadid: '',
    return_type: 0,
    block_list: '',

}

let uploadParam = {
    method: 'upload',
    access_token: access_token,
    type: 'tmpfile',
    path: badiPath,
    uploadid: '',
    partseq: 0
}

let uploadBoduy = {
    file: []
}

let uploadResponse = {
    errno: 0,
    md5: '',
}

let createParam = {
    method: 'create',
    access_token: access_token,
}

let createBody = {
    path: badiPath,
    size: 0,
    isdir: 0,
    block_list: '',
    uploadid: '',
    rtype: 0,
}

let createResponse = {
    errno: 0,
    fs_id: 0,
    md5: "",
    server_filename: "",
    category: 0,
    path: "",
    size: 0,
    ctime: 0,
    mtime: 0,
    isdir: 0,
}

let headers = {
    'Content-Type': 'application/x-www-form-urlencoded'
}

//getFileInfo(filePath)
function getFileInfo(filePath,callback) {
    let readStream = fs.createReadStream(filePath,{highWaterMark: maxSize})
    readStream.on('data',(data) => {
        setFileInfo(data)
        //console.log(fileInfo);
    })
    readStream.on('end',() => {
        genBlockList()
        console.log(fileInfo);
        let options = initPrecreate()
        request(options, precreateCb)
        
    })
    
}


function precreateCb(error, response, body) {
    if (!error && response.statusCode == 200) {
        bodyjson = JSON.parse(body)
        let {path,return_type,block_list,errno,uploadid} = bodyjson
        initPrecreateResponse(bodyjson)
        console.log(bodyjson);
        if (errno != 0) {
            console.log("错误:",errno);
            return 
        }
        if (return_type == 2) {
            console.log("改文件已存在:");
            return
        }
        console.log("开始上传");
        upload()
        // if (block_list.length == 0) {
            

    
        // } else {
        //     console.log("开始分批上传大文件");
    
        // }
        
    }

}

function initBaiduPath(inputPath) {
    return pathHead + inputPath
}

function setFileInfo(data) {
    fs.writeFile('temp'+ fileInfo.data_list.length,data,(err) => {
        console.log(err);
    })
    fileInfo.data_list.push(data)
    fileInfo.size += data.length
    const hash = crypto.createHash('md5')
    hash.update(data, 'utf8');
    const md5 = hash.digest('hex');
    fileInfo.md5_list.push(md5)
}


function genBlockList() {
    let str = '['
    for (i=0;i<fileInfo.md5_list.length;i++) {
        if (i < fileInfo.md5_list.length -1) {
            str += "\"" + fileInfo.md5_list[i] + "\"," 
        } else {
            str += "\"" + fileInfo.md5_list[i] + "\"]" 
        }
    }
    fileInfo.block_list = str
}




function initPrecreate() {
    let options = {}
    options.url = `http://pan.baidu.com/rest/2.0/xpan/file?method=precreate&access_token=${access_token}`
    options.method = 'POST',
    options.headers = headers,
    precreateBody.path = badiPath
    precreateBody.size = fileInfo.size
    precreateBody.block_list = fileInfo.block_list
    options.body = `path=${precreateBody.path}&size=${precreateBody.size}&isdir=${precreateBody.isdir}&autoinit=${precreateBody.autoinit}&rtype=${precreateBody.rtype}&block_list=${precreateBody.block_list}`
    return options
}

function upload() {
    let funArr = []
    if (precreateResponse.block_list.length == 0) {
        precreateResponse.block_list.push(0)
    }
    for (let i=0;i<precreateResponse.block_list.length; i++ ) {
        funArr.push(function(callback) {
            uploadTest(i,callback)
        },)
    }
    async.series(funArr, (err,res) =>{
        create()
    })

}

function uploadTest(i,callback) {
    let url = `https://d.pcs.baidu.com/rest/2.0/pcs/superfile2?access_token=${access_token}&method=upload&type=tmpfile&path=${badiPath}&uploadid=${precreateResponse.uploadid}&partseq=${i}`
    const r = request.post(url,(error, response, body) =>{
        console.log('err',error);
        console.log('body',body);
        let resObj = {}
        resObj.index = i
        resObj.err = error
        resObj.body = body
        callback(error,resObj)
    })
    const form = r.form();
    console.log('发送第个缓存,',"temp"+i);
    form.append('file',fs.createReadStream("temp"+i))
    //callback(null,i)
}

function uploadTestCB(error, response, body,index) {
    console.log('err',error);
    console.log('body',body);
    console.log('index',index);
}

function create() {
    let body = `path=${badiPath}&size=${fileInfo.size}&isdir=${precreateBody.isdir}&uploadid=${precreateResponse.uploadid}&block_list=${fileInfo.block_list}`;
    let url = `https://pan.baidu.com/rest/2.0/xpan/file?method=create&access_token=${access_token}`
    let options = {
        url: url,
        method: 'POST',
        headers: headers,
        body: body
    };
    request(options, createCb)

}

function createCb(error, response, body) {
    if (!error && response.statusCode == 200) {
        console.log(body);
    }
    else {
        console.log(error);
    }
}

function initPrecreateResponse(res) {
    precreateResponse.errno = res.errno
    precreateResponse.path = res.path
    precreateResponse.uploadid = res.uploadid
    precreateResponse.return_type = res.return_type
    precreateResponse.block_list = res.block_list
}



UploadBaidu('3.mp4','appName/308752/308752/3.mp4','121.243aaff966e07b0415b84ed5cbc230df.YaH98rpdBLTGv1DocL5UNviuOfneyHUB4dQiA-D.kBm_WQ')
function UploadBaidu(filePath,savePath,token) {
    fileInfo.filePath = filePath
    access_token = token
    inputPath = filePath
    badiPath = initBaiduPath(savePath)
    // first getFileinfo and generate block_list string
    getFileInfo(filePath,() => {
        console.log("over");
    })

}