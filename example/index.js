var express = require('express')
var app = express()
var path = require('path')

var FormFile = require('../src/FormFile/FormFile')

app.get('/',function(req,res){
    res.sendFile(
        path.resolve('./index.html')
    )
})

app.post('/upload',function(req,res){

    var formFile = new FormFile({
        uploadPath : './uploadSave'
    })
    formFile.parseRequest(req,function(result){
        console.log(result)
    })
    res.send('ok')

})

app.listen(3000)
