var fs = require('fs')
var querystring = require('querystring')
var path = require('path')
var http = require('http')

var BoundaryParser = require('./BinaryParser/BinaryParser')

var EventEmitter = require('events')

class CallBackEmitter extends EventEmitter { }

const callBackEmitter = new CallBackEmitter()

const rn = Buffer.from('\r\n')
const boundaryLength = Buffer.from('------WebKitFormBoundaryruAhtovR3AzRAPJD').length


class FormFile {
    constructor(options = {}) {
        this.binaryArr = []
        this._callback = null
        //监听回调事件
        callBackEmitter.on('callback', () => {
            this._callback(this.finalResult)
        })
        //为了省事，写一个_init方法，在这个方法中处理参数
        this._init(options)
        this._processTimes = 0
        this.finalResult = {}
    }
    _init({ uploadPath }) {
        this.uploadPath = uploadPath
    }
    //解析二进制数据
    _parseBinary(e, length) {

        //解析数据头
        var headers = e.headers

        if (headers['Content-Type'] === undefined) {
            //既然没有携带这个头，那么按文字处理
            this.finalResult[e.headers.name] = e.body.toString().replace(new RegExp('\r\n', 'g'), '')
            this._processTimes++
            if (this._processTimes == length) {
                callBackEmitter.emit('callback')
            }
            return
        }

        var binary = e.body
        //获取数据头中携带的数据类型，并且获得设置好的二进制类型头
        var typeBegin = FormFile.type[headers['Content-Type']]

        //如果没有设置这个头，说明我还没有准备好处理这样的文件，报错
        if (typeBegin === undefined) {
            this.finalResult[e.headers.name] = {
                error: 'can not parse this type of file "' + headers['Content-Type'] + '"'
            }
            console.log(e.headers)
            fs.writeFile(path.resolve('./binaryTestFile' , e.headers.name + Math.random().toFixed(5)), binary, function (err) {
                if (err) {
                    console.log(err)
                    return
                }
                console.log('写入了暂不支持的测试文件')
            })

            this._processTimes++
            if (this._processTimes == length) {
                callBackEmitter.emit('callback')
            }
            //偷偷写入测试一下

            return
        }
        //解析出内容的二进制数据
        console.log(binary.length)
        console.log(binary.indexOf(typeBegin))
        var contentBinary = binary.slice(binary.indexOf(typeBegin), binary.length - boundaryLength)
        console.log(contentBinary.length)
        //获取解析的头携带的文件名（上传时的文件名）
        var fileName = headers.filename

        this.finalResult[headers['name']] = {
            isFile: true,
            filename: fileName
        }
        //写入文件
        fs.writeFile(path.resolve(this.uploadPath, headers.filename), contentBinary, (err) => {
            if (err) {
                throw new Error('Unknow err in saving files')
                return
            }
            this._processTimes++
            if (this._processTimes == length) {
                callBackEmitter.emit('callback')
            }
            //触发回调事件，执行回调函数

        })
    }
    //中间处理函数，使用BoundaryParser模块去处理http带来的二进制数据，然后解析遍历处理
    _processBinary() {
        var b = new BoundaryParser(Buffer.concat(this.binaryArr))
        var arr = b.parse()
        arr.forEach((e) => { 
            this._parseBinary(e, arr.length)
        })
    }
    //对外暴露的解析请求方法
    parseRequest(req, callback) {
        //必须保证是http.IncomingMessage类
        if (!req instanceof http.IncomingMessage) {
            return new TypeError('req is not a IncomingMessage')
        }
        // 初始化callback
        this._callback = callback
        //监听data事件，将二进制数据存储到数组中
        req.on('data', (chunk) => {
            this.binaryArr.push(chunk)
        })
        //结束之后，调用_parseBinary去解析二进制数据
        req.on('end', () => {
            this._processBinary()
        })
    }
}

FormFile.type = {
    'image/png': Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], 'binary'),
    'image/jpeg': Buffer.from([0xFF , 0xD8 , 0xff], 'binary'),
    'text/plain' : Buffer.from(''),
    // 'application/x-zip-compressed' : Buffer.from([0x0d ,0x0a ,0x0d ,0x0a ,0x50 ,0x4b ,0x03 ,0x04 ,0x0a ,0x00 ,0x00 ,0x00 ,0x00 ,0x00 ] , 'binary')
    // 'application/x-zip-compressed' : Buffer.from([0x04034b50],'binary')
}


module.exports = FormFile
