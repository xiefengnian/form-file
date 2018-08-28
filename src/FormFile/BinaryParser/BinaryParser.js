var fs = require('fs')
var querystring = require('querystring')

//定义二进制解析类，这个类的主要作用是将复杂的表单多个提交的值全部解析出来
class BinaryParser {
    //初始化需要传入一个binary（后期改为静态方法）
    constructor(binary) {
        this.binary = binary
        this.boundary = this.binary.slice(0, this.binary.indexOf(Buffer.from('\r\n'))).toString()
        this.endboundary = Buffer.from(this.boundary + '--')
    }
    //解析携带的请求头
    _parseHeader(headers) {
        if (typeof headers === 'string') {
            headers = headers.replace(new RegExp('\r\n', 'g'), ';').replace(new RegExp(' ', 'g'), '')
            headers = headers.split(';')
        }
        var headersObj = {}
        headers.forEach((e) => {
            if (e == '') return
            if (e.indexOf('=') > -1) {
                var obj = querystring.parse(e)
                var key = Object.keys(obj)[0]
                var value = obj[key]
                if (value[0] == '"' && value[value.length - 1] == '"') {
                    value = value.slice(1, value.length - 1)
                }
                headersObj = {
                    ...headersObj,
                    [key]: value
                }
            }
            if (e.indexOf(':') > -1) {
                var key = e.split(':')[0]
                var value = e.split(':')[1]
                headersObj = {
                    ...headersObj,
                    [key]: value
                }
            }
        })
        return headersObj
    }
    //核心的解析方法
    //原理： 通过buffer.indexOf方法不断查找boundary，定位后使用buffer.slice方法进行解析处理
    parse() {
        var index = 0
        var binary = this.binary
        var boundary = this.boundary
        var endboundary = this.endboundary
        var result = []

        //index向前跳过一个boundary的长度
        var jump = function () {
            index += Buffer.from(boundary).length
        }
        var indexs = []

        //当 : binary在位移index之后还能找到boundary，说明后面仍然存在分段，可以继续获取
        while (binary.indexOf(Buffer.from(boundary), index) > -1) {

            // 新的index ，就是binary查找到的下一个boundary的位置
            var newIndex = binary.indexOf(Buffer.from(boundary), index)
            //存储位置
            indexs.push(newIndex)
            //index跳到下一个boundary的开头
            index = newIndex
            //index跳过一个boundary的长度，开始下一个循环寻找下一个
            jump()
        }

        //根据存储的位置去切割binary
        for (var i = 0; i < indexs.length; i++) {
            var beginIndex, endIndex
            beginIndex = indexs[i]
            if (i + 1 > indexs.length - 1) {
                endIndex = binary.length - endboundary.length
            } else {
                endIndex = indexs[i + 1]
            }
            if (i == indexs.length - 1) {
                continue //抛弃最后一个header，因为是空的
            }
            //某一部分
            var part = binary.slice(beginIndex, endIndex)

            //将头用slice解析出来
            /**
             * 在上一部分已经根据boundary将各部分区分开来了，
             * 因此part格式一般是：（可参照./0 或 ./1这个文件）
             * 
             * ------WebKitFormBoundaryaifhiE6QCpeNi2bT\r\n
             * Content-Disposition: form-data; name="text"\r\n
             * \r\n
             * 123123
             * 
             * 因此，可以使用\r\n\r\n将内容和头分隔开来
             */
            var headers = part.slice(
                Buffer.from(boundary).length,
                part.indexOf(Buffer.from('\r\n\r\n'))
            ).toString()
            //解析头
            headers = this._parseHeader(headers)

            //解析身，同样以\r\n\r\n区分
            var body = part.slice(
                part.indexOf(Buffer.from('\r\n\r\n')),
                part.length
            )
            //完成，存放在结果数组
            result.push({
                headers: headers,
                body: body
            })
        }
        return result
    }
}

module.exports = BinaryParser