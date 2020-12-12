var express = require('express');
var Minio = require('minio');
var multiparty = require('multiparty');
var router = express.Router();
const connection = require('../bdd/connection');

var minioClient = new Minio.Client({
  endPoint: '192.168.42.129',
  port: 9000,
  useSSL: false,
  accessKey: 'accessToTest',
  secretKey: 'hHGghglgYhjvbk7646tgyH'
});

/* GET home page. */
router.get('/', function(req, res, next) {
  connection.query("SELECT * FROM FICHIER", function(err, rows) {
    res.render('index', { title: 'Express', data: rows });
  })
});

router.get('/add', function(req, res, next) {
  res.render('add');
});

router.post('/add', function(req, res, next) {
  var form = new multiparty.Form();
  form.parse(req, function(err, fields, files){
    if (err) console.log(err);
    console.log(files);
    if (files.fichier!=undefined) {
      var file = files.fichier[0].path;
        var metaData = {
            'Content-Type': 'application/octet-stream',
            'X-Amz-Meta-Testing': 1234,
            'example': 5678
        }
        // Using fPutObject API upload your file to the bucket europetrip.
        minioClient.fPutObject('project', files.fichier[0].originalFilename, file, metaData, function(err, etag) {
          if (err) return console.log(err)
          console.log('File uploaded successfully.')
        });
        res.redirect("/");
    }
  })
});

module.exports = router;
