## form-file-parser 简单的上传处理组件

为了解决formidable在一个form中上传文件后就无法上传其他数据的问题写的组件

## How To Use 使用

在一个node项目中使用`npm`安装

> cnpm i form-file --save

在HTML中，按照普通的方式提交就可以了，不需要任何特殊的处理。

```html
<!-- form表单提交 -->
<form action="/upload" method="POST" enctype="multipart/form-data">
    <input type="file" name="file">
    <input type="text" name="text">
    <input type="submit" value="提交">
</form>
```

或者使用JavaScript的ajax提交

```javascript
//ajax提交
var form = document.querySelector('#form')
form.addEventListener('submit', function (e) {
    e.preventDefault()
    var uploadFile = function () {
        var formData = new FormData(document.getElementById('form'))
        var xhr = new XMLHttpRequest
        xhr.open('POST','/upload')
        xhr.send(formData)
        xhr.onreadystatechange = function(){
            if(this.readyState == 4){
                console.log(xhr.response)
            }
        }
    }
    uploadFile()
})
```

在Node.js中，结合`express`使用

```javascript

//引入FormFile
var FormFile = require('./FormFile/FormFile')

//express监听'/upload'端口
app.post('/upload',function(req,res){

    //初始化一个FormFile对象
    var formFile = new FormFile({
        uploadPath : './uploadSave' //设置上传文件路径
    })

    //调用解析请求方法，然后获得结果~
    formFile.parseRequest(req,function(result){
        console.log(result)
    })

    res.send('author - skipper')

})

```

假设上传

|name属性  |  type类型 |文件原名\值 |
|----------|----------|---------
|file      | file     | 帅气.png
|text      | text     | skipper.fun


控制台结果如下

```javascript
{
    file: { 
        isFile: true, 
        filename: '帅气.png' 
    }, 
    text: 'skipper.fun' 
}
```

文件已经自动保存到了初始化中设置的`uploadPath`中了,文件路径为`./uploadSave/帅气.png`

## API

> new FormFile(options : object)

options支持如下设置

|  key | type | example|
|------|------|--------|
|uploadPath | string | uploadPath : './uploadSave'|

> formFile.parseRequest(req : IncomingMessage , callback : (result : object))

在callback中，只返回一个参数，即是上传处理结果，
如果req不是IncomingMessage类，则抛出类型错误

example
```javascript
var http = require('http')
http.createServer((req,res)=>{
    var formFile = new FormFile({
        uploadPath : './uploadSave'
    })

    //req是IncomingMessage类，在方法内部会进行instance判断
    formFile.parseRequest(req,(result)=>{})

}).listen(3000)
```

## support files 支持的文件类型
    `image/png` `image/jpeg` `text/plain`

## ToDo 未完成

* 当前类型不完善，仅支持上传png文件。以后要补充在FormFile.type中，区分不同文件处理方式，并且，要把这个分割为模块方便增强
* 完善实例化中更多的option设置
