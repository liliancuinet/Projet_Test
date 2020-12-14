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
    var description = fields.description[0];
    var path = fields.path[0];
    if (path.length!=0 && path.charAt(path.length-1)!="/") {
      path += "/";
    }
    console.log(description);
    console.log(path);
    if (files.fichier!=undefined) {
      var file = files.fichier[0].path;
      var name = files.fichier[0].originalFilename;
        var metaData = {
            'Content-Type': 'application/octet-stream',
            'X-Amz-Meta-Testing': 1234,
            'example': 5678
        }
        // Using fPutObject API upload your file to the bucket europetrip.
        minioClient.fPutObject('project', path+files.fichier[0].originalFilename, file, metaData, function(err2, etag) {
          if (err) return console.log(err)
          console.log('File uploaded successfully.')
        });
        connection.query("INSERT INTO fichier (nom, description, path) VALUES ('"+name+"','"+description+"','"+path+"')", function(err3, rows) {
          if (err3) console.log(err3);
          res.redirect("/");
        });
    }
  })
});

router.get('/delete/:id', function(req, res, next) {
  var id = req.params.id;
  console.log(id);
  connection.query("SELECT * FROM fichier where id="+id, function(err, rows) {
    console.log(rows[0].path+rows[0].nom);
    minioClient.removeObject('project', rows[0].path+rows[0].nom, function(err2) {
      if (err2) {
        return console.log('Unable to remove object', err2)
      }
      console.log('Removed the object');
      connection.query("DELETE FROM fichier WHERE id="+id, function(err3, rows2) {
        if (err3) console.log(err3);
        res.redirect("/"); 
      })
    })
  })
})

router.get('/edit/:id', function(req, res, next) {
  var id = req.params.id;
  connection.query("SELECT * FROM fichier WHERE id="+id, function(err, rows) {
    res.render('edit', { data: rows});
  })
})

router.post('/edit', function(req, res, next) {
  var form = new multiparty.Form();
  form.parse(req, function(err, fields, files){
    if (err) console.log(err);
    var description = fields.description[0];
    var id = fields.id[0];
    var path = fields.path[0];
    var oldname = fields.name[0];
    console.log(description);
    console.log(id);
    if (files.fichier!=undefined) {
      var file = files.fichier[0].path;
      var name = files.fichier[0].originalFilename;
        var metaData = {
            'Content-Type': 'application/octet-stream',
            'X-Amz-Meta-Testing': 1234,
            'example': 5678
        }
        minioClient.removeObject('project', path+oldname, function(err2) {
          if (err2) return console.log(err2);
          console.log('File remove successfully.');
        })
        minioClient.fPutObject('project', path+files.fichier[0].originalFilename, file, metaData, function(err3, etag) {
          if (err3) return console.log(err3);
          console.log('File uploaded successfully.');
        });
        connection.query("UPDATE fichier SET nom='"+name+"', description='"+description+"' WHERE id="+id, function(err4, rows) {
          if (err4) return console.log(err4);
          res.redirect("/");
        });
    }else{
      connection.query("UPDATE fichier SET nom='"+name+"', description='"+description+"' WHERE id="+id, function(err5, rows2) {
        if (err5) return console.log(err5);
        res.redirect("/");
      });
    }
  })
})

router.get('/download/:id', function(req, res, next) {
  var id = req.params.id;
  console.log(id);
  connection.query("SELECT * FROM fichier where id="+id, function(err, rows) {
    console.log(rows[0].path+rows[0].nom);
    minioClient.fGetObject('project', rows[0].path+rows[0].nom, "/tmp/"+rows[0].nom ,function(err2) {
      if (err2) {
        return console.log('Unable to download object', err2)
      }
      console.log('The object has downloaded');
      res.download("/tmp/"+rows[0].nom);
    })
  })
})

module.exports = router;
